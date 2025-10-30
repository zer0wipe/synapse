/**
 * contextBuilder.ts
 *
 * This service is responsible for building a conversational context from a chain of linked Obsidian notes.
 * It traverses backlinks from a starting note up to a specified depth, gathers their content,
 * and formats it into a single string suitable for input to a Large Language Model (LLM).
 */
import { App, TFile } from "obsidian";

/**
 * Manages the process of building conversational context from Obsidian notes.
 * It identifies a chain of related notes (via backlinks) and concatenates their content.
 */
/**
 * ContextBuilder is responsible for constructing the context chain that informs the LLM.
 * It traverses the note graph to build meaningful context for thought generation.
 *
 * Key Responsibilities:
 * - Builds context from a single note
 * - Builds context from multiple selected notes
 * - Manages context depth and relevance
 * - Handles note content formatting
 *
 * Context Chain Structure:
 * 1. Primary note content
 * 2. Selected branch notes (if any)
 * 3. Relevant backlinks (up to configured depth)
 *
 * @example
 * ```typescript
 * const builder = new ContextBuilder(app);
 * const context = await builder.buildAutoContext(activeFile);
 * // or
 * const branchedContext = await builder.buildContextFromNotes(selectedNotes);
 * ```
 */
export class ContextBuilder {
  // The Obsidian App instance, providing access to vault and metadata.
  private app: App;
  // The maximum depth to traverse backlinks when building context.
  private maxDepth: number;
  // Maximum number of notes allowed in the automatically generated context.
  private maxAutoNotes: number;

  /**
   * Constructs a new ContextBuilder instance.
   *
   * Initializes the builder with access to Obsidian's App instance
   * and sets default configuration values.
   *
   * @param app The Obsidian App instance providing access to:
   *            - Vault operations (reading files)
   *            - Metadata cache (backlinks, frontmatter)
   *            - File system operations
   *
   * @example
   * ```typescript
   * const builder = new ContextBuilder(app);
   * builder.updateSettings({ contextDepth: 3, autoContextMaxNotes: 10 });
   * ```
   */
  constructor(app: App) {
    this.app = app;
    this.maxDepth = 5; // Default context depth
    this.maxAutoNotes = 12; // Default automatic context size
  }

  /**
   * Updates the maximum context depth setting.
   * @param maxDepth The new maximum depth for context building.
   */
  public updateSettings(options: {
    contextDepth: number;
    autoContextMaxNotes: number;
  }) {
    this.maxDepth = options.contextDepth;
    this.maxAutoNotes = options.autoContextMaxNotes;
  }

  /**
   * Formats a series of notes into a context string.
   * This is used both for manual branch context building and automatic backlink traversal.
   * @param notes Array of notes to include in the context
   * @returns A formatted string containing the content of the context chain
   */
  public async buildContextFromNotes(notes: TFile[]): Promise<string> {
    return await this.formatNotes(notes);
  }

  /**
   * Builds a conversational context string by combining the active note with its nearby neighbors.
   * The traversal gathers outgoing links and backlinks up to the configured depth and respects the
   * maximum note count limit.
   * @param startFile The Obsidian note from which to start building context.
   * @returns A formatted string containing the content of the context chain.
   */
  async buildAutoContext(startFile: TFile): Promise<string> {
    const chain = this.buildAutoContextChain(startFile);
    return await this.formatNotes(chain);
  }

  /**
   * Finds the "parent" note that links to the given file.
   * The strategy is to find all backlinks and select the most recently modified one
   * as the likely conversational predecessor.
   * @param file The file for which to find the parent.
   * @returns The parent TFile or null if no parent is found.
   */
  private buildAutoContextChain(startFile: TFile): TFile[] {
    const maxNotes = Math.max(1, this.maxAutoNotes);
    const visited = new Set<string>();
    const queue: Array<{ file: TFile; depth: number }> = [
      { file: startFile, depth: 0 },
    ];
    const chain: TFile[] = [];

    while (queue.length > 0 && chain.length < maxNotes) {
      const { file, depth } = queue.shift()!;
      if (visited.has(file.path)) {
        continue;
      }
      visited.add(file.path);
      chain.push(file);

      if (depth >= this.maxDepth) {
        continue;
      }

      for (const neighbor of this.getConnectedFiles(file)) {
        if (!visited.has(neighbor.path)) {
          queue.push({ file: neighbor, depth: depth + 1 });
        }
      }
    }

    return chain;
  }

  private async formatNotes(notes: TFile[]): Promise<string> {
    const sections: string[] = [];
    for (const file of notes) {
      sections.push(await this.formatSingleNote(file));
    }
    return sections.join("");
  }

  private async formatSingleNote(file: TFile): Promise<string> {
    const content = await this.app.vault.read(file);
    const contentWithoutLinks = content.replace(/\[\[.*?\]\]/g, "");
    return `--- [Note: ${file.basename}] ---\n${contentWithoutLinks}\n\n`;
  }

  private getConnectedFiles(file: TFile): TFile[] {
    const connected = new Map<string, TFile>();
    for (const target of this.getOutgoingLinks(file)) {
      connected.set(target.path, target);
    }
    for (const backlink of this.getBacklinks(file)) {
      connected.set(backlink.path, backlink);
    }
    connected.delete(file.path);
    return Array.from(connected.values());
  }

  private getOutgoingLinks(file: TFile): TFile[] {
    const resolved = this.app.metadataCache.resolvedLinks[file.path] ?? {};
    const results: TFile[] = [];
    for (const targetPath in resolved) {
      const targetFile = this.fileFromPath(targetPath);
      if (targetFile) {
        results.push(targetFile);
      }
    }
    return results;
  }

  /**
   * Retrieves all notes that link to the given file (backlinks).
   * It attempts to use an undocumented Obsidian API for efficiency, falling back to a more
   * general method if the API is not available or does not return data.
   * @param file The file for which to get backlinks.
   * @returns An array of TFile objects representing the backlinks.
   */
  private getBacklinks(file: TFile): TFile[] {
    const bucket = new Map<string, TFile>();
    this.collectBacklinksFromCache(file, bucket);
    this.collectBacklinksFromResolvedLinks(file, bucket);
    return Array.from(bucket.values());
  }

  private collectBacklinksFromCache(file: TFile, bucket: Map<string, TFile>) {
    const cache = this.app.metadataCache as MetadataCacheWithBacklinks;
    if (typeof cache.getBacklinksForFile !== "function") {
      return;
    }
    const backlinkData = cache.getBacklinksForFile(file);
    const paths = Object.keys(backlinkData?.data ?? {});
    for (const path of paths) {
      const sourceFile = this.fileFromPath(path);
      if (sourceFile) {
        bucket.set(sourceFile.path, sourceFile);
      }
    }
  }

  private collectBacklinksFromResolvedLinks(
    file: TFile,
    bucket: Map<string, TFile>,
  ) {
    const allLinks = this.app.metadataCache.resolvedLinks;
    for (const sourcePath in allLinks) {
      const links = allLinks[sourcePath];
      if (links && links[file.path]) {
        const sourceFile = this.fileFromPath(sourcePath);
        if (sourceFile) {
          bucket.set(sourceFile.path, sourceFile);
        }
      }
    }
  }

  private fileFromPath(path: string): TFile | null {
    const abstract = this.app.vault.getAbstractFileByPath(path);
    return abstract instanceof TFile ? abstract : null;
  }
}

type BacklinkCache = {
  data: Record<string, unknown>;
};

type MetadataCacheWithBacklinks = App["metadataCache"] & {
  getBacklinksForFile?: (file: TFile) => BacklinkCache | undefined;
};
