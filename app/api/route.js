import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const systemPromp = `You are an AI assistant for a RateMyProfessor-like platform. Your role is to help students find professors based on their specific queries using a RAG (Retrieval-Augmented Generation) system. For each user query, you will:

Analyze the student's request to understand their preferences and requirements.
Use the RAG system to retrieve relevant information about professors from the database.
Rank the professors based on how well they match the student's criteria.
Present the top-matching professor, providing a summary of why they are the best fit.
Offer to provide information on additional professors if the student requests it.

When responding:

Be concise yet informative.
Focus on factual information from the professor reviews and ratings.
Avoid personal opinions or biases.
If there's insufficient information to answer a query, clearly state this and suggest how the student might refine their search.
Always maintain a helpful and student-oriented tone.

Remember:

You don't have real-time access to the actual RateMyProfessor database. Your responses should be based on the information retrieved by the RAG system for each query.
Respect privacy by not sharing personal information about professors beyond what's typically available in a public professor review system.
Encourage students to use this information as one of many factors in their decision-making process.

Example interaction:
Student: "I'm looking for a challenging but fair Calculus professor who explains concepts clearly."
AI: Based on your request, the top match is Professor Alex Chen. Students consistently rate Professor Chen as challenging but fair, with a 4.8/5 for clarity of explanations in Calculus courses. They're known for rigorous problem sets that reinforce learning, and holding extra office hours to support students. Would you like information on additional professors who fit your criteria?
`

export async function POST(req){
    const data = await req.json()
    const pc = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
    })
    const index = pc.index('rag').namespace('test')
    const openai = new OpenAI()
    const text = data[data.length - 1].content
    const embedding = await OpenAI.Embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float',
    })

    const results = await index.query({
        topK: 1,
        includeMetadata: true,
        vector: embedding.data[0].embedding
    })

    let resultString = 
    results.matches.forEach((match)=>{
        resultString+=`
        Professor: ${match.id}
        Review: ${match.metadata.stars}
        Subject: ${match.metadata.subject}
        Stars: ${match.metadata.stars}
        \n\n
        `
    })

    const lastMessage = data[data.length - 1]
    const lastMessageContent = lastMessage.content + resultString
    const lastDataWithoutLastMessage = data.slice(0, data.length - 1)
    const completions = await openai.chat.completions.create({
        messages=[
            {role: 'system', content: systemPrompt},
            ...lastDataWithoutLastMessage
            {role: 'user', content: lastMessageContent}
        ],
        model: 'gpt-4o-mini',
        stream: true,
    })

    const stream = ReadableStream({
        async start(controller){
            const encoder = new TextEncoder()
            try {
                for await (const chunk of completions){
                    const content = chunk.choices[0]?.delta?.content
                    if(content){
                        const text = encoder.encode(content)
                        controller.enqueue(text)
                    }
                }
            }
            catch(err) {
                controller.error(err)
            } finally {
                controller.close()
            }


        }
    })

    return new NextResponse(stream)
}