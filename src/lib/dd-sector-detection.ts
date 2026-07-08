// DD Sector Detection & AI Analysis
// Auto-detects business sector, analyzes documents, detects red flags

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');
const openai = new OpenAI({ apiKey: process.env.VITE_OPENAI_API_KEY });

export interface SectorDetectionResult {
  sector: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  confidence: number;
  reasoning: string;
  keywords: string[];
}

export interface DocumentAnalysis {
  extractedData: Record<string, string | number | boolean>;
  redFlags: string[];
  verificationClaims: Array<{ claim: string; source: string }>;
  followUpQuestions: string[];
  confidence: number;
}

export interface VoiceAnalysis {
  confidenceLevel: number;
  hesitationMarkers: number;
  discomfortIndicators: number;
  speakingPace: 'rapid' | 'measured' | 'slow';
  contradictions: Array<{ claim1: string; claim2: string }>;
  assessment: 'confident' | 'evasive' | 'uncertain';
}

const SECTOR_KEYWORDS = {
  A: ['cleaning', 'staffing', 'logistics', 'field service', 'labor', 'workers', 'scheduling', 'dispatch'],
  B: ['retail', 'e-commerce', 'marketplace', 'store', 'inventory', 'shopping', 'catalog', 'orders'],
  C: ['food', 'restaurant', 'delivery', 'catering', 'chef', 'menu', 'kitchen', 'dining'],
  D: ['software', 'saas', 'app', 'platform', 'api', 'cloud', 'code', 'developer', 'subscription'],
  E: ['manufacturing', 'hardware', 'production', 'factory', 'supply chain', 'component', 'assembly']
};

/**
 * Detects business sector from founder responses
 */
export async function detectSector(responses: string[]): Promise<SectorDetectionResult> {
  const combinedText = responses.join(' ').toLowerCase();
  const sectorScores: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  const foundKeywords: string[] = [];

  // Keyword matching
  Object.entries(SECTOR_KEYWORDS).forEach(([sector, keywords]) => {
    keywords.forEach(keyword => {
      if (combinedText.includes(keyword)) {
        sectorScores[sector]++;
        foundKeywords.push(keyword);
      }
    });
  });

  // Use OpenAI for more nuanced detection
  const prompt = `Analyze these founder responses and determine the business sector.
    Sectors: A=Physical Service, B=Retail, C=Food, D=Software, E=Manufacturing
    Responses: ${responses.slice(0, 3).join(' ')}

    Return JSON: { sector: "A"|"B"|"C"|"D"|"E", confidence: 0-100, reasoning: "..." }`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 200
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    return {
      sector: result.sector || null,
      confidence: result.confidence || 0,
      reasoning: result.reasoning || '',
      keywords: foundKeywords
    };
  } catch (error) {
    // Fallback to keyword matching if OpenAI fails
    const topSector = Object.entries(sectorScores).sort(([, a], [, b]) => b - a)[0];
    return {
      sector: topSector[0] as 'A' | 'B' | 'C' | 'D' | 'E',
      confidence: Math.min(topSector[1] * 20, 95),
      reasoning: `Detected based on keyword matching: ${foundKeywords.slice(0, 3).join(', ')}`,
      keywords: foundKeywords
    };
  }
}

/**
 * Analyzes uploaded documents for red flags and extracts data
 */
export async function analyzeDocument(file: File, documentType: string, interviewId: string): Promise<DocumentAnalysis> {
  let text = '';

  // Extract text from file
  if (file.type === 'application/pdf') {
    // PDF handling would require pdf-parse library
    text = `[PDF Content: ${file.name}]`;
  } else if (file.type.includes('spreadsheet') || file.name.endsWith('.csv')) {
    text = `[Spreadsheet: ${file.name}]`;
  } else {
    text = await file.text();
  }

  const analysisPrompt = `Analyze this ${documentType} document for red flags and extract key data.

    Document: ${text.substring(0, 2000)}

    Return JSON with:
    {
      redFlags: ["flag1", "flag2"],
      extractedData: { revenue: "...", margin: "...", churn: "..." },
      verificationClaims: [{ claim: "...", source: "..." }],
      followUpQuestions: ["question1", "question2"],
      confidence: 0-100
    }`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: analysisPrompt }],
      temperature: 0.3,
      max_tokens: 500
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    return {
      extractedData: result.extractedData || {},
      redFlags: result.redFlags || [],
      verificationClaims: result.verificationClaims || [],
      followUpQuestions: result.followUpQuestions || [],
      confidence: result.confidence || 50
    };
  } catch (error) {
    return {
      extractedData: {},
      redFlags: ['Unable to fully analyze document'],
      verificationClaims: [],
      followUpQuestions: [],
      confidence: 0
    };
  }
}

/**
 * Saves document analysis to Supabase
 */
export async function saveDocumentAnalysis(
  interviewId: string,
  round: number,
  documentType: string,
  analysis: DocumentAnalysis
): Promise<void> {
  try {
    await supabase.from('dd_interview_documents').insert({
      interview_id: interviewId,
      round,
      document_category: documentType,
      auto_analysis: analysis,
      verification_status: 'reviewed',
      parsed_data: analysis.extractedData
    });
  } catch (error) {
    console.error('Failed to save document analysis:', error);
  }
}

/**
 * Analyzes voice characteristics from transcript
 */
export async function analyzeVoiceCharacteristics(transcript: string): Promise<VoiceAnalysis> {
  const filler = (transcript.match(/\b(um|uh|like|you know|so|basically)\b/gi) || []).length;
  const shortResponses = (transcript.match(/[^.!?]*[.!?]/g) || []).filter(s => s.length < 50).length;
  const totalResponses = (transcript.match(/[^.!?]*[.!?]/g) || []).length;

  const analysisPrompt = `Analyze this founder interview transcript for voice characteristics and confidence.

    Transcript: ${transcript.substring(0, 2000)}

    Return JSON:
    {
      confidenceLevel: 0-100,
      discomfortIndicators: 0-10,
      contradictions: [{ claim1: "...", claim2: "..." }],
      assessment: "confident|evasive|uncertain"
    }`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: analysisPrompt }],
      temperature: 0.3,
      max_tokens: 300
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    return {
      confidenceLevel: result.confidenceLevel || 50,
      hesitationMarkers: filler,
      discomfortIndicators: result.discomfortIndicators || 0,
      speakingPace: filler > totalResponses * 0.15 ? 'rapid' : 'measured',
      contradictions: result.contradictions || [],
      assessment: result.assessment || 'uncertain'
    };
  } catch (error) {
    return {
      confidenceLevel: 50,
      hesitationMarkers: filler,
      discomfortIndicators: shortResponses > totalResponses * 0.4 ? 5 : 2,
      speakingPace: 'measured',
      contradictions: [],
      assessment: 'uncertain'
    };
  }
}

/**
 * Generates AI-powered follow-up questions based on transcript and sector
 */
export async function generateFollowUpQuestions(
  transcript: string,
  sector: string,
  round: number
): Promise<string[]> {
  const prompt = `Based on this founder interview for a ${sector} company in round ${round},
    generate 3 thoughtful follow-up questions that probe deeper into concerns or unclear areas.

    Transcript: ${transcript.substring(0, 1500)}

    Return only a JSON array of strings: ["question1", "question2", "question3"]`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 300
    });

    const result = JSON.parse(completion.choices[0].message.content || '[]');
    return Array.isArray(result) ? result : [];
  } catch (error) {
    return [
      'Can you provide more detail on your customer acquisition strategy?',
      'How do you plan to address the competitive risks you mentioned?',
      'What would cause you to pivot your business model?'
    ];
  }
}

/**
 * Detects red flags from transcript and documents
 */
export async function detectRedFlags(
  transcript: string,
  documentAnalysis: DocumentAnalysis[],
  sector: string
): Promise<Array<{ text: string; severity: 'WALK_AWAY' | 'PRICE_IT_IN' | 'MONITOR' }>> {
  const redFlags: Array<{ text: string; severity: 'WALK_AWAY' | 'PRICE_IT_IN' | 'MONITOR' }> = [];

  // Collect all document red flags
  documentAnalysis.forEach(doc => {
    doc.redFlags.forEach(flag => {
      redFlags.push({ text: flag, severity: 'MONITOR' });
    });
  });

  // Use OpenAI to identify transcript red flags
  const prompt = `Identify red flags in this ${sector} company interview that would concern an investor.
    Classify each as: WALK_AWAY (fatal flaw), PRICE_IT_IN (manageable), or MONITOR (watch closely).

    Transcript: ${transcript.substring(0, 2000)}

    Return JSON array: [{ text: "...", severity: "WALK_AWAY"|"PRICE_IT_IN"|"MONITOR" }]`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 400
    });

    const aiRedFlags = JSON.parse(completion.choices[0].message.content || '[]');
    redFlags.push(...aiRedFlags);
  } catch (error) {
    // Fallback red flags based on transcript keywords
    if (transcript.includes('running out of cash') || transcript.includes('runway')) {
      redFlags.push({ text: 'Potential runway concerns mentioned', severity: 'WALK_AWAY' });
    }
    if (transcript.includes('team is leaving') || transcript.includes('key person')) {
      redFlags.push({ text: 'Key person risk identified', severity: 'PRICE_IT_IN' });
    }
  }

  // Remove duplicates and return top 5
  const uniqueFlags = Array.from(new Map(redFlags.map(f => [f.text, f])).values());
  return uniqueFlags.slice(0, 5);
}

/**
 * Generates comprehensive AI analysis report
 */
export async function generateAnalysisReport(
  interviewId: string,
  transcript: string,
  sector: string,
  round: number
): Promise<{
  redFlags: Array<{ text: string; severity: string }>;
  followUpQuestions: string[];
  voiceAnalysis: VoiceAnalysis;
  sectorInsights: string[];
}> {
  const voiceAnalysis = await analyzeVoiceCharacteristics(transcript);
  const followUpQuestions = await generateFollowUpQuestions(transcript, sector, round);
  const redFlags = await detectRedFlags(transcript, [], sector);

  // Generate sector-specific insights
  const insightPrompt = `Given this ${sector} company interview, provide 2-3 sector-specific insights for due diligence.

    Transcript excerpt: ${transcript.substring(0, 1000)}

    Return JSON array of strings: ["insight1", "insight2", "insight3"]`;

  let sectorInsights: string[] = [];
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: insightPrompt }],
      temperature: 0.5,
      max_tokens: 300
    });

    sectorInsights = JSON.parse(completion.choices[0].message.content || '[]');
  } catch (error) {
    sectorInsights = [`Continue probing ${sector}-specific unit economics`];
  }

  return {
    redFlags,
    followUpQuestions,
    voiceAnalysis,
    sectorInsights
  };
}
