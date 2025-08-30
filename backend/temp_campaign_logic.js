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
      const headers = csvLines[0].split(',').map(h => h.trim());
      
      // Count valid contacts
      for (let i = 1; i < csvLines.length; i++) {
        const values = csvLines[i].split(',').map(v => v.trim());
        const contact = {};
        headers.forEach((header, index) => {
          contact[header] = values[index] || '';
        });
        
        if (contact.telefono || contact.phone) {
          totalContactsToSend++;
        }
      }
      
      console.log(`📊 Total contacts to send: ${totalContactsToSend}`);
    } catch (error) {
      console.error('Error reading CSV file:', error);
      return res.status(400).json({
        success: false,
        error: 'Error al procesar archivo CSV'
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
          messagesLimit: currentUser.messagesLimit
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
      }
    };

    const job = await addCampaignJob({
      campaignId: campaign.id,
      csvBuffer: csvBuffer,
      template: template,
      userId: req.user.id,
      userName: currentUser.name,
      variableMappings: variableMappings ? JSON.parse(variableMappings) : {},
      defaultValues: defaultValues ? JSON.parse(defaultValues) : {}
    }, jobOptions);

    console.log(`⏳ Campaign job queued: ${job.id}`);

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
      message: 'Campaña agregada a la cola de procesamiento',
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: 'queued',
        totalContacts: totalContactsToSend,
        template: template.name,
        jobId: job.id
      }
    });

  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear campaña'
    });
  }