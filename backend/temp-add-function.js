// Temporary function to add to sofiaAIService.js

/**
 * Generate Sofia's response using dynamic AI-generated prompt
 */
async function generateSofiaResponseWithDynamicPrompt(conversation, messageText, intent, dynamicPrompt) {
  try {
    console.log('🤖 Generating Sofia response with dynamic prompt...');
    
    if (!dynamicPrompt || !dynamicPrompt.success) {
      console.log('⚠️ No dynamic prompt available, falling back to static');
      return await generateSofiaResponse(conversation, messageText, intent);
    }

    // Use OpenAI with the dynamic prompt
    const aiResponse = await openaiService.generateNaturalResponseWithCustomPrompt(
      conversation.messages || [],
      dynamicPrompt.systemPrompt,
      dynamicPrompt.businessContext,
      intent
    );

    if (!aiResponse.success) {
      console.log('⚠️ AI response failed, falling back');
      return await generateSofiaResponse(conversation, messageText, intent);
    }

    // Analyze next step (keep existing logic)
    const nextStepAnalysis = await determineNextStep(
      aiResponse.message,
      conversation.lead,
      { engagement: 'medium', objections: [] },
      conversation.currentStep
    );

    return {
      message: aiResponse.message,
      nextStep: nextStepAnalysis.nextStep,
      leadUpdates: nextStepAnalysis.leadUpdates || {},
      shouldSendContent: nextStepAnalysis.shouldSendContent || false,
      contentToSend: nextStepAnalysis.contentToSend,
      handoffRequired: nextStepAnalysis.handoffRequired || false,
      aiGenerated: true,
      dynamicPrompt: true,
      tokens_used: aiResponse.tokens_used
    };

  } catch (error) {
    console.error('❌ Dynamic prompt response failed:', error);
    return await generateSofiaResponse(conversation, messageText, intent);
  }
}