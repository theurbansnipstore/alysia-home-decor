import "server-only";

export interface UploadInput {
  buffer: Buffer;
  filename: string;
  contentType: string;
  /** Logical grouping, e.g. "products" — providers may map this to a folder/prefix. */
  folder: string;
}

export interface UploadResult {
  /** Publicly reachable URL — what ProductImage.url stores and the storefront renders. */
  url: string;
  /** Provider-specific reference used to delete/manage the file later — what ProductImage.storageKey stores. */
  storageKey: string;
}

export interface StorageProvider {
  upload(input: UploadInput): Promise<UploadResult>;
  /** No-op (not an error) if the key is already gone — deleting a product image should never fail because storage is already clean. */
  remove(storageKey: string): Promise<void>;
}
