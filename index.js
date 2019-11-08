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
 */
const getQuestion = (quizType, count) => {
    return questions[quizTypeMap[quizType]][count];
};

const StartQuizIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
        request.intent.name === 'StartQuizIntent';
  },
  handle(handlerInput) {
    const quizType = Alexa.getSlotValue(handlerInput.requestEnvelope, 'quizType');
    const question = getQuestion(quizType, 0);
    
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

const getResultSpeech = (response, expectedAnswer) => {
    let resultSpeech;
    if (response === expectedAnswer) {
        resultSpeech = speechMap.CORRECT_ANSWER;
    } else {
        resultSpeech = speechMap.INCORRECT_ANSWER.replace('{response}', response).replace('{answer}', expectedAnswer);
    }
    return resultSpeech;
};

const AnswerIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
        request.intent.name === 'AnswerIntent';
  },
  handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const response = Alexa.getSlotValue(handlerInput.requestEnvelope, 'answer');
    const expectedAnswer = _.get(sessionAttributes, "expectedAnswer", "not available");
    const resultSpeech = getResultSpeech(response, expectedAnswer);
    
    const quizType = _.get(sessionAttributes, "quizType", "data structures")
    
    const numQuestionsAnswered = _.get(sessionAttributes, "numQuestionsAnswered", 0) + 1;
    if (numQuestionsAnswered >= max_num_questions) {
        return handlerInput.responseBuilder
            .speak(resultSpeech + speechMap.COMPLETED_QUIZ.replace('{quizType}', quizType))
            .getResponse();
    } else {
        _.set(sessionAttributes, "numQuestionsAnswered", numQuestionsAnswered);
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

const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
      request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak(speechMap.HELP_MESSAGE)
      .reprompt(speechMap.GENERIC_REPROMPT)
      .getResponse();
  },
};

const FallbackHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
      request.intent.name === 'AMAZON.FallbackIntent';
  },
  handle(handlerInput) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak(speechMap.FALLBACK_MESSAGE)
      .reprompt(speechMap.GENERIC_REPROMPT)
      .getResponse();
  },
};

const ExitHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
      (request.intent.name === 'AMAZON.CancelIntent' ||
        request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak(speechMap.STOP_MESSAGE)
      .getResponse();
  },
};

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

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);
    console.log(`Error stack: ${error.stack}`);
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak(speechMap.ERROR_MESSAGE)
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.custom();

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