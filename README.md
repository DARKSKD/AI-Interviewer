AI Voice Interviewer

An AI-powered voice-based interview platform that generates tailored interview questions and conducts interactive mock interviews. It dynamically adapts to the candidate’s uploaded resume, specified job role, and focus topics.

🚀 Features

Resume-driven question generation using Cerebras API.

Voice-based interaction with ElevenLabs (Text-to-Speech) and Speech-to-Text integration.

PDF resume parsing via PDF.co.

Session storage & user management with Supabase.

Backend automation powered by n8n workflows for seamless API coordination.

Frontend UI built in React for smooth candidate interaction.

🛠️ Tech Stack

Frontend: React

Backend Automation: n8n workflows (2 separate flows for processing & storage)

APIs & Services:

**Cerebras API** **( Main Role )**
 – AI-based question generation

PDF.co
 – PDF parsing

ElevenLabs
 – Text-to-Speech

Speech-to-Text service (via ElevenLabs / custom integration)

Gemini
- Key skills and attributes

Supabase
 – database & session storage

⚙️ How It Works

User uploads a resume (PDF) and specifies a job role + focus topics.

Resume text is extracted using PDF.co.

n8n workflow calls the Cerebras API to generate interview questions.

Questions are converted to voice output using ElevenLabs TTS.

User responds via microphone; Speech-to-Text transcribes the answer.

Responses, questions, and session data are stored in Supabase.

**Start Interview.JSON**
<img width="1681" height="369" alt="image" src="https://github.com/user-attachments/assets/371123ed-9bdb-4c5f-94d4-3a9a07b11775" />

**Answer Handler.JSON**
<img width="1659" height="289" alt="image" src="https://github.com/user-attachments/assets/c71703cb-c456-449c-ab31-aec30cc33e34" />


