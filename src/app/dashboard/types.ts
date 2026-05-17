export type SnippetItem = {
  id: string;
  slug: string;
  title: string;
  template: string;
  updatedAt: string;
  visibility: "public" | "private";
  tags: string[];
  pinned: boolean;
  viewCount: number;
};

export type BlogItem = {
  id: string;
  title: string;
  published: boolean;
  createdAt: string;
  viewCount: number;
};

export type ChallengeItem = {
  id: string;
  slug: string;
  title: string;
  published: boolean;
  difficulty: string;
  updatedAt: string;
  stepCount: number;
  attemptCount: number;
};

export type FeedItem = {
  id: string;
  slug: string;
  title: string;
  template: string;
  updatedAt: string;
  viewCount: number;
  userName: string | null;
  userImage: string | null;
};
