import type { GameDefinition } from "@/lib/types"
import { pythonBeginner } from "./questions/beginner"
import { pythonIntermediate } from "./questions/intermediate"
import { pythonHard } from "./questions/hard"
import { pythonVeryHard } from "./questions/veryHard"
import { pythonExtreme } from "./questions/extreme"

export const pythonGame: GameDefinition = {
  id: "python",
  name: "Python",
  shortDescription: "From syntax basics to GIL internals, generators, and LRU cache design.",
  category: "Programming & Coding",
  icon: "FileCode2",
  accent: "from-blue-500 to-cyan-400",
  syllabus: [
    "Variables, data types, operators, and I/O",
    "Conditions and loops",
    "Strings, lists, tuples, sets, and dictionaries",
    "Functions, scope, and recursion",
    "Exceptions, modules, and file handling",
    "Object-oriented programming",
    "Iterators, generators, decorators, and context managers",
    "Complexity analysis and data structures",
    "Algorithms and problem solving",
    "Testing, debugging, and code quality",
    "Concurrency and performance fundamentals",
    "Advanced interview challenges",
  ],
  questions: [...pythonBeginner, ...pythonIntermediate, ...pythonHard, ...pythonVeryHard, ...pythonExtreme],
}
