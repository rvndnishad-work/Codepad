// Every page under /interview-questions uses the shared wow classes and
// --wow-* colours. Loading them here means a direct visit looks the same as
// arriving from a page that already loaded them.
import "@/components/wow/wow.css";
import "@/components/home-wow/home-wow.css";
import "./interview-questions.css";

export default function InterviewQuestionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
