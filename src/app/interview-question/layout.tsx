// The question page uses the shared wow classes and --wow-* colours, plus its
// own reading styles. Loading them here means a direct visit looks the same as
// arriving from a page that already loaded them.
import "@/components/wow/wow.css";
import "@/components/home-wow/home-wow.css";
import "../interview-questions/interview-questions.css";
import "./question.css";

export default function InterviewQuestionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
