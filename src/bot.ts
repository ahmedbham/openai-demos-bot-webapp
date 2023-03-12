// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ActivityHandler, MessageFactory } from 'botbuilder';
import axios, { AxiosResponse, AxiosRequestHeaders } from 'axios';

export class EchoBot extends ActivityHandler {
    constructor() {
        super();

        interface RequestBody {
            prompt: string;
            max_tokens: number;
            temperature: number;
            // presence_penalty: string;
            // frequency_penalty: string;

        }

        interface OpenAiResponse {
            choices: [
                {
                    text: string;
                }
            ],
            usage: {
                total_tokens: number;
            }
        }

        let prompt = `
        As an advanced chatbot, your primary goal is to assist users to the best of your ability. This may involve answering questions, providing helpful information, or completing tasks based on user input. In order to effectively assist users, it is important to be detailed and thorough in your responses. Use examples and evidence to support your points and justify your recommendations or solutions.

        <conversation history>

        User: <user input>
        Chatbot:
        `
        const url = "https://jp-aiservice.openai.azure.com/openai/deployments/chatbot/completions?api-version=2022-12-01"
       
        let conversation_history = ""
        
        const headers = {
        'Content-Type': 'application/json',
        // 'Authorization': 'Bearer YOUR_TOKEN'
        
        'api-key': process.env.OPENAI_API_KEY
        }


        async function postDataToEndpoint(url: string, requestBody: RequestBody, headers: AxiosRequestHeaders): Promise<OpenAiResponse> {
            try {
              const response: AxiosResponse = await axios.post(url, requestBody, {headers});
              return response.data;
            } catch (error) {
              throw new Error(`Error posting data to ${url}: ${error}`);
            }
        }

        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {
            
            // construct prompt
            let tmp_prompt = prompt.replace("<conversation history>", conversation_history).replace("<user input>", context.activity.text)
            
            // construct request body
            const requestBody =     {
                prompt: tmp_prompt
                , max_tokens: 1500
                , temperature: 0.7
                // , presence_penalty: "0.0"
                // , frequency_penalty: "0.0"
            };

            // send request to openai
            const data = await postDataToEndpoint(url, requestBody, headers);

            // update conversation history
            conversation_history = conversation_history + "User: " + context.activity.text + "\nChatbot: " + data.choices[0].text + "\n"
            
            // send response to user
            const replyText = `${ data.choices[0].text } [~  ${data.usage.total_tokens} tokens]`;
            // const replyText = `Echox: ${ context.activity.text } value: ${ context.activity.value }`;
            await context.sendActivity(MessageFactory.text(replyText));
            
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Hello and welcome!';
            // delete converstaion history
            conversation_history = ""
            for (const member of membersAdded) {
                if (member.id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }
}
