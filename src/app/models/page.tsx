import { Metadata } from "next";
import Models from "./components/Models";

export const metadata: Metadata = {
  title: "模型设置",
  description: "模型设置",
};

export default function ModelsPage() {
  return <Models />;
}
