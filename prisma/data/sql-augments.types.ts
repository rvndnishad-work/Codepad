export type SqlVariant = {
  tech: string;
  code: string;
  label?: string;
  runnable?: boolean;
};

export type SqlExample = {
  label?: string;
  code?: string;
  tech?: string;
  runnable?: boolean;
  variants?: SqlVariant[];
};

export type SqlAugment = {
  title: string;
  description?: string;
  answer?: string;
  examples?: SqlExample[];
};

