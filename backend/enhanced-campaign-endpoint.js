// Enhanced Campaign Creation Endpoint with Queue System
// This replaces the existing immediate processing with background queue processing

app.post('/api/campaigns/create', authenticateToken, campaignUpload.single('csvFile'), async (req, res) => {
  console.log('🚀 Enhanced Campaign create endpoint hit');
  try {
    const { name, templateSid, variableMappings, defaultValues } = req.body;
    const csvFile = req.file;
    console.log('📋 Request body:', { name, templateSid, variableMappings, defaultValues });
    console.log('📁 File:', csvFile ? 'Present' : 'Missing');

    if (!csvFile) {
      return res.status(400).json({
        success: false,
        error: 'Archivo CSV es requerido'
      });
    }

    // Read and validate CSV file
    const fs = require('fs');
    let totalContactsToSend = 0;
    let csvBuffer = null;
    
    try {
      csvBuffer = fs.readFileSync(csvFile.path);
      const csvContent = csvBuffer.toString('utf8');
      const csvLines = csvContent.split('\n').filter(line => line.trim());
      
      if (csvLines.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'El archivo CSV debe contener al menos una fila de datos'
        });
      }
      
      const headers = csvLines[0].split(',').map(h => h.trim());
      
      // Count valid contacts
      for (let i = 1; i < csvLines.length; i++) {
        const values = csvLines[i].split(',').map(v => v.trim());
        const contact = {};
        headers.forEach((header, index) => {
          contact[header] = values[index] || '';
        });
        
        if (contact.telefono || contact.phone || contact.Phone || contact.celular) {
          totalContactsToSend++;
        }
      }
      
      console.log(`📊 Total contacts to send: ${totalContactsToSend}`);
      
      if (totalContactsToSend === 0) {
        return res.status(400).json({
          success: false,
          error: 'No se encontraron contactos válidos en el archivo CSV'
        });
      }
      
    } catch (error) {
      console.error('Error reading CSV file:', error);
      return res.status(400).json({
        success: false,
        error: 'Error al procesar archivo CSV. Verifica que el formato sea correcto.'
      });
    }

    // Validate user plan limits
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        name: true,
        messagesUsed: true,
        messagesLimit: true,
        planType: true
      }
    });

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const messagesAvailable = currentUser.messagesLimit - currentUser.messagesUsed;
    
    console.log(`📋 Plan validation:`, {
      planType: currentUser.planType,
      messagesUsed: currentUser.messagesUsed,
      messagesLimit: currentUser.messagesLimit,
      messagesAvailable: messagesAvailable,
      contactsToSend: totalContactsToSend
    });

    if (totalContactsToSend > messagesAvailable) {
      console.log('🚫 LÍMITE EXCEDIDO - BLOQUEANDO ENVÍO');
      return res.status(403).json({
        success: false,
        error: 'Límite de mensajes excedido',
        details: {
          required: totalContactsToSend,
          available: messagesAvailable,
          planType: currentUser.planType,
          messagesUsed: currentUser.messagesUsed,
          messagesLimit: currentUser.messagesLimit,
          suggestion: messagesAvailable > 0 
            ? `Puedes enviar hasta ${messagesAvailable} mensajes con tu plan actual` 
            : 'Actualiza tu plan para enviar más mensajes'
        }
      });
    }

    if (!templateSid) {
      return res.status(400).json({
        success: false,
        error: 'Template SID es requerido'
      });
    }

    // Find template
    const template = await prisma.template.findFirst({
      where: {
        OR: [
          { twilioSid: templateSid },
          { twilioContentSid: templateSid },
          { twilioTemplateId: templateSid },
          { name: templateSid }
        ],
        AND: {
          OR: [
            { isPublic: true },
            { userId: req.user.id }
          ]
        }
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Plantilla no encontrada o no disponible'
      });
    }

    console.log('📋 Template found:', `${template.name} (${template.id})`);

    // Create campaign record in 'queued' status
    const campaign = await prisma.campaign.create({
      data: {
        name: name || `Campaign ${new Date().toLocaleString()}`,
        templateId: template.id,
        userId: req.user.id,
        status: 'queued',
        totalContacts: totalContactsToSend,
        sentCount: 0,
        errorCount: 0,
        sentAt: new Date()
      }
    });

    console.log(`📝 Campaign created in queue: ${campaign.name} (${campaign.id})`);

    // Add job to queue for background processing
    const jobOptions = {
      delay: 1000, // Start processing in 1 second
      priority: currentUser.planType === 'enterprise' ? 1 : 
                currentUser.planType === 'pro' ? 2 : 3, // Enterprise gets highest priority
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 5, // Keep last 5 completed jobs
      removeOnFail: 20     // Keep last 20 failed jobs
    };

    const job = await addCampaignJob({
      campaignId: campaign.id,
      csvBuffer: csvBuffer,
      template: template,
      userId: req.user.id,
      userName: currentUser.name || 'Usuario',
      variableMappings: variableMappings ? JSON.parse(variableMappings) : {},
      defaultValues: defaultValues ? JSON.parse(defaultValues) : {}
    }, jobOptions);

    console.log(`⏳ Campaign job queued: ${job.id} with priority ${jobOptions.priority}`);

    // Clean up uploaded file immediately
    try {
      fs.unlinkSync(csvFile.path);
      console.log('🗑️ CSV file deleted for security');
    } catch (cleanupError) {
      console.error('⚠️ Could not delete CSV file:', cleanupError.message);
    }

    // Return immediate response - processing will happen in background
    res.json({
      success: true,
      message: 'Campaña agregada a la cola de procesamiento. Comenzará el envío en unos segundos.',
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: 'queued',
        totalContacts: totalContactsToSend,
        template: template.name,
        jobId: job.id,
        estimatedStartTime: new Date(Date.now() + jobOptions.delay).toISOString(),
        priority: jobOptions.priority
      }
    });

  } catch (error) {
    console.error('Error creating campaign:', error);
    
    // Clean up file in case of error
    if (req.file && req.file.path) {
      try {
        const fs = require('fs');
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Could not delete file after error:', cleanupError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al crear campaña'
    });
  }
});