import { Metadata } from "next";
import { StarredMessages } from "./components/StarredMessages";

export const metadata: Metadata = {
  title: "我的收藏",
  description: "我的收藏",
};

export default function StarPage() {
  return <StarredMessages />;
}
