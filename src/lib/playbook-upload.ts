// Writes an AI-parsed playbook document (see playbook-upload.functions.ts) into
// dd_framework_rounds/questions for a given toolkit, reusing the same CRUD helpers
// the manual designer uses.
import {
  createFrameworkRound, updateFrameworkRound, createFrameworkQuestion, updateFrameworkQuestion,
} from "@/lib/dd-framework-admin";

export type ParsedPlaybook = {
  playbook_name: string;
  playbook_description: string;
  rounds: {
    title: string; subtitle: string; purpose: string; duration: string;
    questions: {
      question_text: string; rephrased_question: string; why_text: string;
      internal_guideline: string; grading: { text: string; severity: "WALK_AWAY" | "PRICE_IT_IN" | "MONITOR" }[];
    }[];
  }[];
};

export async function buildPlaybookFromParsed(toolkitId: string, parsed: ParsedPlaybook) {
  for (const round of parsed.rounds) {
    const created = await createFrameworkRound(toolkitId);
    await updateFrameworkRound(created.round, {
      title: round.title, subtitle: round.subtitle, purpose: round.purpose, duration: round.duration,
    });
    let sortOrder = 1;
    for (const q of round.questions) {
      const createdQ = await createFrameworkQuestion(created.round, sortOrder++);
      await updateFrameworkQuestion(createdQ.id, {
        question_text: q.question_text,
        rephrased_question: q.rephrased_question || null,
        why_text: q.why_text,
        internal_guideline: q.internal_guideline || null,
        red_flags: q.grading ?? [],
      });
    }
  }
}
