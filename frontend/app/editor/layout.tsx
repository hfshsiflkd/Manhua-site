import "../globals.css";
import EditorLayout from "./components/EditorLayout";

export default function EditorLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <EditorLayout>{children}</EditorLayout>;
}
