import type { Question } from "@/lib/types"
import { MultipleChoiceExercise } from "./MultipleChoiceExercise"
import { CodingExercise } from "./CodingExercise"
import { ScenarioExercise } from "./ScenarioExercise"

export function ExerciseRenderer({ question, submitted, onSubmit }: { question: Question; submitted: boolean; onSubmit: (correct: boolean) => void }) {
  switch (question.type) {
    case "multiple-choice":
      return <MultipleChoiceExercise question={question} submitted={submitted} onSubmit={onSubmit} />
    case "coding":
    case "debugging":
      return <CodingExercise question={question} submitted={submitted} onSubmit={onSubmit} />
    case "scenario":
    case "system-design":
      return <ScenarioExercise question={question} submitted={submitted} onSubmit={onSubmit} />
  }
}
