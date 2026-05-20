export type LinkStatus = "Downloaded" | "Pending" | "Broken";

export interface LinkItem {
  id: number;
  title: string;
  links: string[];
  source: string;
  status: LinkStatus;
}

export interface TextItem {
  id: number;
  title: string;
  content: string;
  name: string;
  timestamp: string;
}
