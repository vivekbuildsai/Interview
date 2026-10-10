// The game registry is the single place that lists every game card the
// Library page renders. Adding a new game -- playable or "coming soon"
// -- never touches the dashboard, navigation, scoring, or persistence
// code; it's purely a new entry here (or a new fully-fledged
// GameDefinition imported from src/games/<id>/index.ts).

import type { Difficulty, GameDefinition, Question } from "./types"
import { pythonGame } from "@/games/python"
import { kubernetesGame } from "@/games/kubernetes"
import { telecomGame } from "@/games/telecom"

function comingSoon(def: Omit<GameDefinition, "questions" | "comingSoon">): GameDefinition {
  return { ...def, questions: [], comingSoon: true }
}

export const GAMES: GameDefinition[] = [
  pythonGame,
  kubernetesGame,
  telecomGame,

  // Programming & Coding -- architecture-ready, content not written yet.
  comingSoon({ id: "java", name: "Java", shortDescription: "JVM internals, collections, concurrency, and Spring-flavored interview questions.", category: "Programming & Coding", icon: "Coffee", accent: "from-orange-500 to-red-500", syllabus: ["Syntax & OOP", "Collections framework", "Concurrency", "JVM & memory model"] }),
  comingSoon({ id: "c", name: "C", shortDescription: "Pointers, memory management, and the fundamentals every systems interview checks.", category: "Programming & Coding", icon: "Braces", accent: "from-slate-400 to-slate-600", syllabus: ["Pointers & memory", "Structs & unions", "Manual memory management"] }),
  comingSoon({ id: "cpp", name: "C++", shortDescription: "RAII, move semantics, templates, and modern C++ interview staples.", category: "Programming & Coding", icon: "Binary", accent: "from-indigo-500 to-blue-700", syllabus: ["RAII & smart pointers", "Templates", "Move semantics"] }),
  comingSoon({ id: "typescript", name: "TypeScript", shortDescription: "Type system depth, generics, and the gotchas that show up in frontend interviews.", category: "Programming & Coding", icon: "FileType2", accent: "from-blue-600 to-sky-400", syllabus: ["Type system & generics", "Structural typing", "Utility types"] }),
  comingSoon({ id: "dsa", name: "Data Structures & Algorithms", shortDescription: "The classic whiteboard round -- trees, graphs, DP, and complexity analysis.", category: "Programming & Coding", icon: "GitBranch", accent: "from-emerald-500 to-teal-500", syllabus: ["Trees & graphs", "Dynamic programming", "Complexity analysis"] }),
  comingSoon({ id: "oop", name: "Object-Oriented Programming", shortDescription: "SOLID principles, design patterns, and real OOP design trade-offs.", category: "Programming & Coding", icon: "Component", accent: "from-violet-500 to-fuchsia-500", syllabus: ["SOLID principles", "Design patterns", "Composition vs. inheritance"] }),
  comingSoon({ id: "system-design", name: "System Design", shortDescription: "Scalability, reliability, and the trade-offs behind designing large systems.", category: "Programming & Coding", icon: "Workflow", accent: "from-cyan-500 to-indigo-500", syllabus: ["Scalability patterns", "Caching & databases", "Reliability & failure modes"] }),

  // Cloud & Infrastructure
  comingSoon({ id: "docker", name: "Docker & Containers", shortDescription: "Images, layers, networking, and container runtime internals.", category: "Cloud & Infrastructure", icon: "Container", accent: "from-sky-400 to-blue-500", syllabus: ["Images & layers", "Container networking", "Runtime internals"] }),
  comingSoon({ id: "linux", name: "Linux", shortDescription: "Processes, permissions, shell tools, and the fundamentals every SRE interview checks.", category: "Cloud & Infrastructure", icon: "Terminal", accent: "from-zinc-400 to-zinc-600", syllabus: ["Processes & signals", "Permissions", "Shell tooling"] }),
  comingSoon({ id: "networking", name: "Networking", shortDescription: "TCP/IP, DNS, load balancing, and the fundamentals behind every outage.", category: "Cloud & Infrastructure", icon: "Network", accent: "from-blue-500 to-violet-500", syllabus: ["TCP/IP fundamentals", "DNS", "Load balancing"] }),
  comingSoon({ id: "cicd", name: "CI/CD", shortDescription: "Pipelines, deployment strategies, and release engineering interview questions.", category: "Cloud & Infrastructure", icon: "GitMerge", accent: "from-lime-500 to-green-600", syllabus: ["Pipeline design", "Deployment strategies", "Release engineering"] }),
  comingSoon({ id: "cloud-architecture", name: "Cloud Architecture", shortDescription: "Multi-region design, cost trade-offs, and real cloud architecture scenarios.", category: "Cloud & Infrastructure", icon: "Cloud", accent: "from-sky-500 to-cyan-400", syllabus: ["Multi-region design", "Cost trade-offs", "Managed services"] }),

  // Future domains
  comingSoon({ id: "sql", name: "SQL & Databases", shortDescription: "Query optimization, indexing, transactions, and schema design.", category: "Programming & Coding", icon: "Database", accent: "from-amber-500 to-orange-500", syllabus: ["Query optimization", "Indexing", "Transactions & isolation"] }),
  comingSoon({ id: "os", name: "Operating Systems", shortDescription: "Processes, scheduling, virtual memory, and the CS fundamentals round.", category: "Programming & Coding", icon: "Cpu", accent: "from-stone-400 to-stone-600", syllabus: ["Processes & threads", "Scheduling", "Virtual memory"] }),
  comingSoon({ id: "networks-cs", name: "Computer Networks", shortDescription: "OSI layers, routing, and the theory behind the Networking game.", category: "Programming & Coding", icon: "Wifi", accent: "from-teal-500 to-cyan-600", syllabus: ["OSI model", "Routing", "Transport protocols"] }),
  comingSoon({ id: "ai-ml", name: "AI & Machine Learning", shortDescription: "Model fundamentals, evaluation, and the ML-systems interview round.", category: "Programming & Coding", icon: "BrainCircuit", accent: "from-purple-500 to-pink-500", syllabus: ["Model fundamentals", "Evaluation metrics", "ML systems"] }),
  comingSoon({ id: "llm-agents", name: "LLMs & AI Agents", shortDescription: "Prompting, tool use, RAG, and agent architecture interview questions.", category: "Programming & Coding", icon: "Bot", accent: "from-fuchsia-500 to-violet-600", syllabus: ["Prompting & context", "RAG", "Agent / tool-use architecture"] }),
  comingSoon({ id: "testing", name: "Software Testing & Automation", shortDescription: "Test strategy, mocking, and the quality-engineering interview round.", category: "Programming & Coding", icon: "TestTube2", accent: "from-green-500 to-emerald-600", syllabus: ["Test strategy", "Mocking & fixtures", "CI test automation"] }),
  comingSoon({ id: "distributed-systems", name: "Distributed Systems", shortDescription: "Consensus, consistency models, and the senior-systems interview round.", category: "Programming & Coding", icon: "Share2", accent: "from-indigo-500 to-blue-600", syllabus: ["Consensus (Raft/Paxos)", "Consistency models", "Partition tolerance"] }),
  comingSoon({ id: "cybersecurity", name: "Cybersecurity", shortDescription: "Threat modeling, common vulnerabilities, and security-engineering questions.", category: "Programming & Coding", icon: "ShieldAlert", accent: "from-red-500 to-rose-600", syllabus: ["Threat modeling", "Common vulnerabilities (OWASP)", "Secure design"] }),
]

export function getGame(id: string): GameDefinition | undefined {
  return GAMES.find((g) => g.id === id)
}

export function getPlayableGames(): GameDefinition[] {
  return GAMES.filter((g) => !g.comingSoon)
}

export const CATEGORIES = Array.from(new Set(GAMES.map((g) => g.category)))

export function findQuestion(id: string): Question | undefined {
  for (const game of GAMES) {
    const q = game.questions.find((q) => q.id === id)
    if (q) return q
  }
  return undefined
}

export function questionsForDifficulty(gameId: string, difficulty: Difficulty): Question[] {
  const game = getGame(gameId)
  if (!game) return []
  return game.questions.filter((q) => q.difficulty === difficulty)
}

// Fisher-Yates, fine for session variety -- nothing security-sensitive here.
export function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function reviewQuestions(reviewQueue: string[]): Question[] {
  return reviewQueue.map((id) => findQuestion(id)).filter((q): q is Question => Boolean(q))
}
