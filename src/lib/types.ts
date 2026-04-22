export type LinkStatus = "Downloaded" | "Pending" | "Broken";

export interface LinkItem {
  id: number;
  title: string;
  links: string[];
  source: string;
  status: LinkStatus;
}
