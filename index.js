const _ = require('lodash');
const Alexa = require('ask-sdk-core');
const questions = require('./questions');
const speechMap = require('./speechMap');

const max_num_questions = 2;

const quizTypeMap = {
    "data structures": "DATA_STRUCTURES",
    "object oriented programming": "OOP",
    "algorithms": "ALGS"
}

/**
 * Handler for LaunchRequest. Welcomes the user when they open the skill.
 */
const LaunchHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(speechMap.ONBOARDING_MESSAGE)
      .reprompt(speechMap.GENERIC_REPROMPT)
      .getResponse();
  },
}

/**
 * Returns the question from questionMap matching the type and request number.
 * @param quizType type of quiz, either "data structures", "object oriented programming", "algorithms"
 * @param questionIndex index of the desired question. The first question is index 0.
 */
const getQuestion = (quizType, questionIndex) => {
    return questions[quizTypeMap[quizType]][questionIndex];
};

/**
 * Handler for StartQuizIntent. Begins the type of quiz that the user selected.
 */
const StartQuizIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
        request.intent.name === 'StartQuizIntent';
  },
  handle(handlerInput) {
    // Get the type of quiz that the user selected.  
    const quizType = Alexa.getSlotValue(handlerInput.requestEnvelope, 'quizType');
    // Get the first question for that quiz type.
    const question = getQuestion(quizType, 0);
    
    // Add data to the session attributes. These will be used by AnswerIntentHandler to verify the answer.
    const sessionAttributes = handlerInput.attributesManager.setSessionAttributes({
        'quizType': quizType,
        'expectedAnswer': question.ANSWER
    });
    const outputSpeech = speechMap.CONFIRM_QUIZ_TYPE.replace('{quizType}', quizType) + question.PROMPT;
    
    return handlerInput.responseBuilder
      .speak(outputSpeech)
      .withShouldEndSession(false)
      .getResponse();
  },
};

/**
 * Returns speech telling user if their answer was correct or not.
 * @param userResponse user's answer to the question
 * @param expectedAnswer correct answer to the question
 */ 
const getResultSpeech = (userResponse, expectedAnswer) => {
    let resultSpeech;
    if (userResponse === expectedAnswer) {
        resultSpeech = speechMap.CORRECT_ANSWER;
    } else {
        resultSpeech = speechMap.INCORRECT_ANSWER.replace('{response}', userResponse).replace('{answer}', expectedAnswer);
    }
    return resultSpeech;
};

/**
 * Handler for AnswerIntent. Verifies user's answer, then either asks another or exits the skill.
 */
const AnswerIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
        request.intent.name === 'AnswerIntent';
  },
  handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    
    // Verify user's response.
    const userResponse = Alexa.getSlotValue(handlerInput.requestEnvelope, 'answer');
    const expectedAnswer = _.get(sessionAttributes, "expectedAnswer", "not available");
    const resultSpeech = getResultSpeech(userResponse, expectedAnswer);
    
    // Retrieve quizType so next question has the same type.
    const quizType = _.get(sessionAttributes, "quizType", "data structures")
    
    // Increment number-of-questions-answered counter. If 2, exit the skill.
    const numQuestionsAnswered = _.get(sessionAttributes, "numQuestionsAnswered", 0) + 1;
    if (numQuestionsAnswered >= max_num_questions) {
        return handlerInput.responseBuilder
            .speak(resultSpeech + speechMap.COMPLETED_QUIZ.replace('{quizType}', quizType))
            .getResponse();
    } else {
        // Save numQuestionsAnswered to sessionAttributes so it can be retrieved later.
        _.set(sessionAttributes, "numQuestionsAnswered", numQuestionsAnswered);
        
        // Get next question and update expectedAnswer.
        const question = getQuestion(quizType, numQuestionsAnswered);
        _.set(sessionAttributes, "expectedAnswer", question.ANSWER);
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
        
        const outputSpeech = resultSpeech + speechMap.NEXT_QUESTION + question.PROMPT;
        
        return handlerInput.responseBuilder
          .speak(outputSpeech)
          .withShouldEndSession(false)
          .getResponse();
    }
  },
};

/**
 * Handler for HelpIntent. Reminds user of the skill's functionality and guides them back to the right path.
 */
const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
      request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(speechMap.HELP_MESSAGE)
      .reprompt(speechMap.GENERIC_REPROMPT)
      .getResponse();
  },
};

/**
 * Handler for FallbackIntent. Helps user when they've said something the skill doesn't support.
 */
const FallbackHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
      request.intent.name === 'AMAZON.FallbackIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(speechMap.FALLBACK_MESSAGE)
      .reprompt(speechMap.GENERIC_REPROMPT)
      .getResponse();
  },
};

/**
 * Handler for CancelIntent and StopIntent. Says goodbye to the user and exits the skill.
 */
const ExitHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
      (request.intent.name === 'AMAZON.CancelIntent' ||
        request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(speechMap.STOP_MESSAGE)
      .getResponse();
  },
};

/**
 * Handler for SessionEndedRequest. Logs why the session ended. Helpful for debugging.
 */
const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
    return handlerInput.responseBuilder.getResponse();
  },
};

/**
 * Generic error handler. Informs user that an error has occurred and exits skill. Logs the error for debugging.
 */
const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);
    console.log(`Error stack: ${error.stack}`);
    return handlerInput.responseBuilder
      .speak(speechMap.ERROR_MESSAGE)
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.custom();

/**
 * Setup for the skill. All new handlers must be added in addRequestHandlers.
 */ 
exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchHandler,  
    StartQuizIntentHandler,
    AnswerIntentHandler,
    HelpHandler,
    ExitHandler,
    FallbackHandler,
    SessionEndedRequestHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();