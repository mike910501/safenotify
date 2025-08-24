'use client'

import { useState, useCallback, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { 
  Upload, FileText, AlertCircle, CheckCircle, X, 
  ChevronDown, ChevronUp, Shield, Clock, Trash2,
  FileCheck, AlertTriangle, Users, FileSpreadsheet
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AnimatedIcon } from '@/components/ui/animated-icon'

interface CSVRow {
  nombre: string
  telefono: string
  [key: string]: string
}

interface ColumnInfo {
  original: string
  mapped: string
  type: 'text' | 'number' | 'date' | 'time' | 'phone'
  completeness: number
  required: boolean
}

interface ValidationError {
  row: number
  field: string
  message: string
}

interface UploadState {
  status: 'idle' | 'uploading' | 'validating' | 'processing' | 'complete' | 'error'
  progress: number
  message: string
}

interface CSVUploaderProps {
  onDataProcessed?: (data: CSVRow[], columns: ColumnInfo[]) => void
  onContinue?: () => void
}

export function CSVUploader({ onDataProcessed, onContinue }: CSVUploaderProps) {
  
  const [file, setFile] = useState<File | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    message: ''
  })
  const [isDragging, setIsDragging] = useState(false)
  const [csvData, setCsvData] = useState<CSVRow[]>([])
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [validCount, setValidCount] = useState(0)
  const [invalidCount, setInvalidCount] = useState(0)
  const [showPreview, setShowPreview] = useState(false)
  const [retentionTime, setRetentionTime] = useState('24')
  const [countdown, setCountdown] = useState('24:00:00')
  const [detectedColumns, setDetectedColumns] = useState<ColumnInfo[]>([])
  const [availableVariables, setAvailableVariables] = useState<string[]>([])
  const [fileType, setFileType] = useState<'csv' | 'excel' | null>(null)

  // Countdown timer effect
  useEffect(() => {
    if (uploadState.status === 'complete') {
      let hours = parseInt(retentionTime)
      let minutes = 0
      let seconds = 0

      const timer = setInterval(() => {
        if (seconds > 0) {
          seconds--
        } else if (minutes > 0) {
          minutes--
          seconds = 59
        } else if (hours > 0) {
          hours--
          minutes = 59
          seconds = 59
        } else {
          clearInterval(timer)
          setCountdown('00:00:00')
        }
        
        setCountdown(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        )
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [uploadState.status, retentionTime])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const getFileType = (file: File): 'csv' | 'excel' | null => {
    const name = file.name.toLowerCase()
    if (name.endsWith('.csv')) return 'csv'
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) return 'excel'
    return null
  }

  const isValidFile = (file: File) => {
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    const validExtensions = ['.csv', '.xls', '.xlsx']
    
    return validTypes.includes(file.type) || 
           validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (isValidFile(file)) {
        processFile(file)
      } else {
        setUploadState({ 
          status: 'error', 
          progress: 0, 
          message: 'Solo se aceptan archivos CSV (.csv) o Excel (.xlsx, .xls)' 
        })
      }
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      if (isValidFile(file)) {
        processFile(file)
      } else {
        setUploadState({ 
          status: 'error', 
          progress: 0, 
          message: 'Solo se aceptan archivos CSV (.csv) o Excel (.xlsx, .xls)' 
        })
      }
    }
  }

  // Smart column mapping system
  const mapColumnName = (originalName: string): string => {
    const cleaned = originalName.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    
    // Name variations
    if (['nombre', 'name', 'cliente', 'paciente', 'persona', 'contacto'].includes(cleaned)) {
      return 'nombre'
    }
    
    // Phone variations  
    if (['telefono', 'teléfono', 'phone', 'celular', 'movil', 'móvil', 'whatsapp', 'tel'].includes(cleaned)) {
      return 'telefono'
    }
    
    // Date variations
    if (['fecha', 'date', 'dia', 'día'].includes(cleaned)) {
      return 'fecha'
    }
    
    // Time variations
    if (['hora', 'time', 'horario', 'tiempo'].includes(cleaned)) {
      return 'hora'
    }
    
    // Doctor/professional variations
    if (['doctor', 'medico', 'médico', 'profesional', 'dr', 'dra'].includes(cleaned)) {
      return 'doctor'
    }
    
    // Office/location variations
    if (['consultorio', 'oficina', 'sala', 'ubicacion', 'ubicación', 'lugar'].includes(cleaned)) {
      return 'consultorio'
    }
    
    // Company variations
    if (['empresa', 'company', 'organizacion', 'organización'].includes(cleaned)) {
      return 'empresa'
    }
    
    // Return original if no mapping found
    return cleaned
  }

  const detectColumnType = (values: any[]): 'text' | 'number' | 'date' | 'time' | 'phone' => {
    const sampleSize = Math.min(10, values.length)
    const sample = values.slice(0, sampleSize).filter(v => v && String(v).trim())
    
    if (sample.length === 0) return 'text'
    
    // Phone detection
    if (sample.every(v => /^[\+]?[0-9\-\s\(\)]{7,}$/.test(v))) return 'phone'
    
    // Number detection
    if (sample.every(v => /^\d+(\.\d+)?$/.test(v))) return 'number'
    
    // Date detection
    if (sample.some(v => /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(v))) return 'date'
    
    // Time detection
    if (sample.some(v => /^\d{1,2}:\d{2}(:\d{2})?\s?(AM|PM|am|pm)?$/.test(v))) return 'time'
    
    return 'text'
  }

  const calculateCompleteness = (values: any[]): number => {
    const nonEmpty = values.filter(v => v && String(v).trim()).length
    return Math.round((nonEmpty / values.length) * 100)
  }

  const analyzeColumns = (data: any[][]): ColumnInfo[] => {
    if (data.length === 0) return []
    
    const headers = data[0]
    const columns: ColumnInfo[] = []
    
    headers.forEach((header: string, index: number) => {
      const values = data.slice(1).map(row => row[index] || '')
      const mapped = mapColumnName(header)
      const type = mapped === 'telefono' ? 'phone' : detectColumnType(values)
      const completeness = calculateCompleteness(values)
      const required = mapped === 'nombre' || mapped === 'telefono'
      
      columns.push({
        original: header,
        mapped,
        type,
        completeness,
        required
      })
    })
    
    return columns
  }

  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '')
    
    // If it's a Colombian number without country code, add +57
    if (cleaned.length === 10 && cleaned.startsWith('3')) {
      cleaned = '57' + cleaned
    }
    
    // Add + if not present
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned
    }
    
    return cleaned
  }

  const validatePhoneNumber = (phone: string): boolean => {
    const formatted = formatPhoneNumber(phone)
    // Check if it's a valid Colombian number or international format
    const colombianRegex = /^\+57[0-9]{10}$/
    const internationalRegex = /^\+[0-9]{10,15}$/
    
    return colombianRegex.test(formatted) || internationalRegex.test(formatted)
  }

  const parseCSVLine = (line: string) => {
    // Try comma first, then semicolon
    let delimiter = ','
    if (line.includes(';') && line.split(';').length > line.split(',').length) {
      delimiter = ';'
    }
    
    return line.split(delimiter).map(v => v.trim().replace(/['"]/g, ''))
  }

  const processFile = async (file: File) => {
    setFile(file)
    const detectedFileType = getFileType(file)
    setFileType(detectedFileType)
    
    setUploadState({ status: 'uploading', progress: 0, message: 'Subiendo archivo...' })
    
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 100))
      setUploadState(prev => ({ ...prev, progress: i }))
    }
    
    if (detectedFileType === 'excel') {
      setUploadState({ status: 'processing', progress: 0, message: 'Leyendo archivo Excel...' })
      await new Promise(resolve => setTimeout(resolve, 500))
      setUploadState({ status: 'processing', progress: 50, message: 'Procesando hoja 1...' })
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    setUploadState({ status: 'validating', progress: 100, message: 'Validando datos...' })
    
    try {
      let parsedData: any[][] = []
      
      // Check if it's Excel or CSV
      if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
        // Process Excel file
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        
        // Convert to array of arrays
        parsedData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      } else {
        // Process CSV file
        const text = await file.text()
        console.log('File Content:', text.substring(0, 200)) // Debug log
        
        // Handle different line endings
        const lines = text.split(/\r?\n|\r/).filter(line => line.trim())
        
        if (lines.length === 0) {
          setUploadState({ 
            status: 'error', 
            progress: 0, 
            message: 'El archivo está vacío' 
          })
          return
        }
        
        // Parse each line with flexible delimiter detection
        parsedData = lines.map(line => parseCSVLine(line))
      }
      
      if (parsedData.length === 0) {
        setUploadState({ 
          status: 'error', 
          progress: 0, 
          message: 'El archivo está vacío' 
        })
        return
      }
      
      // Analyze all columns with smart mapping
      const columnAnalysis = analyzeColumns(parsedData)
      setDetectedColumns(columnAnalysis)
      
      console.log('Column analysis:', columnAnalysis) // Debug log
      
      // Show detected columns message
      const columnNames = columnAnalysis.map(col => col.original).join(', ')
      setUploadState({ 
        status: 'processing', 
        progress: 100, 
        message: `Detectamos ${columnAnalysis.length} columnas: ${columnNames}` 
      })
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Check for required columns using smart mapping
      const hasNombre = columnAnalysis.some(col => col.mapped === 'nombre')
      const hasTelefono = columnAnalysis.some(col => col.mapped === 'telefono')
      
      if (!hasNombre || !hasTelefono) {
        const missingFields = []
        if (!hasNombre) missingFields.push('nombre')
        if (!hasTelefono) missingFields.push('telefono')
        
        setUploadState({ 
          status: 'error', 
          progress: 0, 
          message: `El archivo debe tener columnas "${missingFields.join('" y "')}". Columnas encontradas: ${columnNames}` 
        })
        return
      }
      
      // Create variable mapping for templates
      const variables = columnAnalysis.map(col => col.mapped)
      setAvailableVariables(variables)
      
      // Find column indices using smart mapping
      const nameColumn = columnAnalysis.find(col => col.mapped === 'nombre')!
      const phoneColumn = columnAnalysis.find(col => col.mapped === 'telefono')!
      const nameIndex = columnAnalysis.indexOf(nameColumn)
      const phoneIndex = columnAnalysis.indexOf(phoneColumn)
      
      const data: CSVRow[] = []
      const errors: ValidationError[] = []
      let valid = 0
      let invalid = 0
      
      setUploadState({ status: 'processing', progress: 0, message: 'Procesando contactos...' })
      
      // Process data rows (skip header row)
      for (let i = 1; i < parsedData.length; i++) {
        const values = parsedData[i].map((v: any) => String(v || '').trim())
        
        const row: CSVRow = {
          nombre: values[nameIndex] || '',
          telefono: values[phoneIndex] || ''
        }
        
        // Add all columns with their mapped names
        columnAnalysis.forEach((column, index) => {
          if (index !== nameIndex && index !== phoneIndex) {
            row[column.mapped] = values[index] || ''
          }
        })
        
        // Validate row
        let hasError = false
        
        if (!row.nombre) {
          errors.push({ row: i, field: 'nombre', message: 'Campo nombre está vacío' })
          hasError = true
        }
        
        if (!row.telefono) {
          errors.push({ row: i, field: 'telefono', message: 'Campo teléfono está vacío' })
          hasError = true
        } else if (!validatePhoneNumber(row.telefono)) {
          errors.push({ 
            row: i, 
            field: 'telefono', 
            message: 'Número telefónico inválido (debe incluir código de país)' 
          })
          hasError = true
        } else {
          // Format the phone number
          row.telefono = formatPhoneNumber(row.telefono)
        }
        
        if (hasError) {
          invalid++
        } else {
          valid++
        }
        
        data.push(row)
        
        // Update progress
        const progress = Math.round((i / parsedData.length) * 100)
        setUploadState(prev => ({ ...prev, progress }))
        await new Promise(resolve => setTimeout(resolve, 10))
      }
      
      setCsvData(data)
      setValidationErrors(errors)
      setValidCount(valid)
      setInvalidCount(invalid)
      
      // Call callback with processed data - use columnAnalysis directly, not state!
      console.log('CSV Uploader - calling onDataProcessed with:', {
        dataLength: data.length,
        columnsLength: columnAnalysis.length,
        columns: columnAnalysis.map(col => ({ original: col.original, mapped: col.mapped }))
      })
      onDataProcessed?.(data, columnAnalysis)
      
      if (errors.length === 0) {
        setUploadState({ 
          status: 'complete', 
          progress: 100, 
          message: 'Listo para enviar' 
        })
      } else {
        setUploadState({ 
          status: 'complete', 
          progress: 100, 
          message: 'Validación completada con errores' 
        })
      }
    } catch (error) {
      console.error('Error processing file:', error)
      
      // Enhanced error handling for different file types
      let errorMessage = 'Error al procesar el archivo. '
      
      if (error instanceof Error) {
        if (detectedFileType === 'excel') {
          if (error.message.includes('password') || error.message.includes('protected')) {
            errorMessage = 'No se pudo leer el archivo Excel. Verifique que no esté protegido con contraseña.'
          } else if (error.message.includes('corrupt') || error.message.includes('invalid')) {
            errorMessage = 'Archivo Excel dañado o formato no compatible. Intente guardar como .xlsx nuevamente.'
          } else {
            errorMessage = 'Error al leer el archivo Excel. Verifique que sea un archivo válido.'
          }
        } else if (detectedFileType === 'csv') {
          if (error.message.includes('encoding')) {
            errorMessage = 'Problema de codificación detectado. Guarde el CSV con codificación UTF-8.'
          } else {
            errorMessage = 'Error al leer el archivo CSV. Verifique el formato y los delimitadores.'
          }
        } else {
          errorMessage = 'Archivo dañado o formato no compatible. Solo se aceptan archivos CSV y Excel.'
        }
      }
      
      setUploadState({ 
        status: 'error', 
        progress: 0, 
        message: errorMessage 
      })
    }
  }

  const downloadExcelExample = () => {
    const sampleData = [
      ['nombre', 'telefono', 'fecha', 'hora', 'doctor', 'consultorio'],
      ['Juan Pérez', '3001234567', '2024-01-15', '14:30', 'Dr. González', 'Consulta 101'],
      ['María García', '+573109876543', '2024-01-16', '10:00', 'Dra. López', 'Consulta 205'],
      ['Carlos Rodríguez', '300-555-1234', '2024-01-17', '16:15', 'Dr. Martínez', 'Consulta 103'],
      ['Ana Martínez', '(310) 222 3456', '2024-01-18', '09:45', 'Dra. Hernández', 'Consulta 201'],
      ['Luis González', '3157894561', '2024-01-19', '11:30', 'Dr. Sánchez', 'Consulta 107'],
      ['Sofia López', '+573204567890', '2024-01-22', '13:00', 'Dra. Torres', 'Consulta 208'],
      ['Pedro Sánchez', '318 765 4321', '2024-01-23', '15:20', 'Dr. Ramírez', 'Consulta 105'],
      ['Laura Torres', '3001112233', '2024-01-24', '08:30', 'Dra. Flores', 'Consulta 203'],
      ['Diego Ramírez', '+573119998877', '2024-01-25', '17:00', 'Dr. Castro', 'Consulta 109'],
      ['Carmen Flores', '3226667788', '2024-01-26', '12:15', 'Dra. Morales', 'Consulta 206']
    ]

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet(sampleData)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contactos')
    
    // Download the file
    XLSX.writeFile(workbook, 'contactos-ejemplo.xlsx')
  }

  const resetUpload = () => {
    setFile(null)
    setUploadState({ status: 'idle', progress: 0, message: '' })
    setCsvData([])
    setValidationErrors([])
    setValidCount(0)
    setInvalidCount(0)
    setShowPreview(false)
  }

  return (
    <div className="space-y-6">
      {/* Privacy Banner */}
      <Card className="bg-gradient-to-r from-primary-50 to-secondary-50 border-primary-200" padding="lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AnimatedIcon icon={Shield} className="text-primary-600" size={24} animation="pulse" />
            <div>
              <h3 className="font-semibold text-gray-900">Sus datos están seguros</h3>
              <p className="text-sm text-gray-600">
                Procesamiento local - sin envío a servidores externos
              </p>
            </div>
          </div>
          {uploadState.status === 'complete' && (
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">Eliminación automática en:</p>
              <p className="text-lg font-mono font-bold text-primary-600">{countdown}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Upload Area */}
      {uploadState.status === 'idle' && (
        <Card 
          className={`border-2 border-dashed transition-all duration-300 ${
            isDragging 
              ? 'border-primary-500 bg-primary-50 shadow-lg shadow-primary-500/20' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          padding="xl"
        >
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="text-center py-12 cursor-pointer"
            onClick={() => document.getElementById('csv-input')?.click()}
          >
            <div className="flex justify-center space-x-4 mb-4">
              <div className={`transition-all duration-300 ${isDragging ? 'animate-pulse' : ''}`}>
                <FileText className={`${isDragging ? 'text-primary-600' : 'text-gray-400'}`} size={40} />
                <span className="text-xs text-gray-500 block text-center mt-1">CSV</span>
              </div>
              <div className={`transition-all duration-300 ${isDragging ? 'animate-pulse' : ''}`}>
                <FileSpreadsheet className={`${isDragging ? 'text-secondary-600' : 'text-gray-400'}`} size={40} />
                <span className="text-xs text-gray-500 block text-center mt-1">Excel</span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Arrastra tu archivo CSV o Excel aquí
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              o haz clic para seleccionar archivo
            </p>
            <Button variant="outline" size="sm" className="mx-auto">
              <FileText className="mr-2" size={16} />
              Seleccionar Archivo
            </Button>
            <input
              id="csv-input"
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="mt-6 text-xs text-gray-500">
              <p>Máximo: 10MB • Hasta 10,000 contactos</p>
              <p>Formatos soportados: CSV, Excel (.xlsx, .xls)</p>
              <p>Columnas requeridas: "nombre" y "telefono"</p>
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <a 
                  href="/sample-contacts.csv" 
                  download="contactos-ejemplo.csv"
                  className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium"
                >
                  <FileText className="mr-1" size={14} />
                  Descargar ejemplo (CSV)
                </a>
                <button
                  onClick={downloadExcelExample}
                  className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium"
                >
                  <FileText className="mr-1" size={14} />
                  Descargar ejemplo (Excel)
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Upload Progress */}
      {(uploadState.status === 'uploading' || uploadState.status === 'validating' || uploadState.status === 'processing') && (
        <Card className="bg-white" padding="xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                {uploadState.status === 'uploading' && (
                  <AnimatedIcon icon={Upload} className="text-primary-600" animation="pulse" />
                )}
                {uploadState.status === 'validating' && (
                  <AnimatedIcon icon={FileCheck} className="text-primary-600" animation="spin" />
                )}
                {uploadState.status === 'processing' && (
                  <AnimatedIcon icon={Users} className="text-primary-600" animation="pulse" />
                )}
                <span className="font-medium text-gray-900">{uploadState.message}</span>
              </div>
              <span className="text-sm font-mono text-gray-600">{uploadState.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${uploadState.progress}%` }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Results */}
      {uploadState.status === 'complete' && (
        <>
          {/* Enhanced Summary Card */}
          <Card className="bg-white" padding="lg">
            <div className="space-y-6">
              {/* Success Message */}
              <div className="text-center">
                <div className="inline-flex items-center space-x-2 text-green-600 mb-2">
                  <CheckCircle size={24} />
                  <span className="text-lg font-semibold">✅ {csvData.length} contactos cargados exitosamente</span>
                </div>
                <p className="text-gray-600">
                  📊 Datos detectados: {detectedColumns.map(col => col.original).join(', ')}
                </p>
                <p className="text-primary-600 font-medium mt-2">
                  🎯 Listo para seleccionar plantilla y mapear variables
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-full bg-green-100">
                    <CheckCircle className="text-green-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Datos completos</p>
                    <p className="text-xl font-bold text-gray-900">✅ {validCount}</p>
                  </div>
                </div>
                
                {invalidCount > 0 && (
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-full bg-yellow-100">
                      <AlertTriangle className="text-yellow-600" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Campos opcionales vacíos</p>
                      <p className="text-xl font-bold text-gray-900">⚠️ {invalidCount}</p>
                      <p className="text-xs text-gray-500">(usarán valores por defecto)</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-full bg-blue-100">
                    <FileSpreadsheet className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Archivo</p>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file?.name} ({fileType?.toUpperCase()})
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-full bg-purple-100">
                    <Users className="text-purple-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Columnas detectadas</p>
                    <p className="text-xl font-bold text-gray-900">{detectedColumns.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Variable Availability Display */}
          <Card className="bg-gradient-to-r from-primary-50 to-secondary-50 border-primary-200" padding="lg">
            <h3 className="font-semibold text-gray-900 mb-3">Variables disponibles para sus plantillas</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {detectedColumns.map((column, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        column.completeness > 95 ? 'bg-green-500' :
                        column.completeness > 70 ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <span className="font-medium text-gray-900">{`{${column.mapped}}`}</span>
                        <span className="text-sm text-gray-500 ml-2">({column.original})</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-medium ${
                        column.completeness > 95 ? 'text-green-600' :
                        column.completeness > 70 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {column.completeness > 95 ? '✅' : column.completeness > 70 ? '⚠️' : '❌'} {column.completeness}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-600 text-center">
                Estas variables estarán disponibles para sus plantillas de WhatsApp
              </p>
            </div>
          </Card>

          {/* Data Preview */}
          <Card className="bg-white" padding="lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Vista previa de datos</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? (
                  <>
                    <ChevronUp className="mr-2" size={16} />
                    Ocultar
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-2" size={16} />
                    Ver todos los {csvData.length} contactos
                  </>
                )}
              </Button>
            </div>
            
            <div className="mb-4 space-y-2">
              <p className="text-sm text-gray-600">
                Mostrando primeras {Math.min(5, csvData.length)} filas con <strong>TODAS</strong> las columnas detectadas:
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                <span className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                  <span>Teléfono</span>
                </span>
                <span className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  <span>Fecha</span>
                </span>
                <span className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                  <span>Hora</span>
                </span>
                <span className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                  <span>Número</span>
                </span>
                <span className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                  <span>Texto</span>
                </span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    {detectedColumns.map((column, index) => (
                      <th key={index} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center space-x-1">
                          <span>{column.original}</span>
                          <div className={`w-2 h-2 rounded-full ${
                            column.type === 'phone' ? 'bg-blue-400' :
                            column.type === 'date' ? 'bg-green-400' :
                            column.type === 'time' ? 'bg-purple-400' :
                            column.type === 'number' ? 'bg-orange-400' : 'bg-gray-400'
                          }`} title={`Tipo: ${column.type}`} />
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {csvData.slice(0, showPreview ? csvData.length : 5).map((row, index) => {
                    const hasError = validationErrors.some(e => e.row === index + 1)
                    return (
                      <tr key={index} className={hasError ? 'bg-red-50' : ''}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {index + 1}
                        </td>
                        {detectedColumns.map((column, colIndex) => (
                          <td key={colIndex} className={`px-4 py-3 whitespace-nowrap text-sm ${
                            column.type === 'phone' ? 'font-mono' : ''
                          } text-gray-900`}>
                            {row[column.mapped] || <span className="text-gray-400 italic">vacío</span>}
                          </td>
                        ))}
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {hasError ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <X size={12} className="mr-1" />
                              Error
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle size={12} className="mr-1" />
                              Válido
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Card className="bg-red-50 border-red-200" padding="lg">
              <div className="mb-4 flex items-start space-x-3">
                <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-2">
                    Errores de validación ({validationErrors.length})
                  </h3>
                  <ul className="space-y-1 text-sm text-red-700">
                    {validationErrors.slice(0, 5).map((error, index) => (
                      <li key={index}>
                        Fila {error.row}: {error.message}
                      </li>
                    ))}
                    {validationErrors.length > 5 && (
                      <li className="font-medium">
                        ... y {validationErrors.length - 5} errores más
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {/* Data Retention Options */}
          <Card className="bg-gray-50" padding="lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Clock className="text-gray-600" size={20} />
                <div>
                  <label htmlFor="retention" className="font-medium text-gray-900">
                    Eliminar datos en:
                  </label>
                  <p className="text-xs text-gray-600">
                    NUNCA almacenamos datos permanentemente
                  </p>
                </div>
              </div>
              <select
                id="retention"
                value={retentionTime}
                onChange={(e) => setRetentionTime(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="1">1 hora después del envío</option>
                <option value="12">12 horas después del envío</option>
                <option value="24">24 horas después del envío</option>
                <option value="48">48 horas después del envío</option>
              </select>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            {validCount > 0 && (
              <Button 
                size="lg" 
                className="flex-1 gradient-primary cta-glow"
                onClick={onContinue}
              >
                Continuar al envío ({validCount} contactos)
              </Button>
            )}
            <Button 
              size="lg" 
              variant="outline" 
              onClick={resetUpload}
              className="flex-1"
            >
              <Upload className="mr-2" size={20} />
              Cargar otro archivo
            </Button>
          </div>
        </>
      )}

      {/* Error State */}
      {uploadState.status === 'error' && (
        <Card className="bg-red-50 border-red-200" padding="lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-2">Error al procesar archivo</h3>
              <p className="text-red-700">{uploadState.message}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetUpload}
                className="mt-4"
              >
                Intentar de nuevo
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}