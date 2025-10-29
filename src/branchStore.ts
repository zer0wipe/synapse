import { Events, TFile } from 'obsidian';

export interface BranchEntry {
    file: TFile;
}

export type BranchEvent = 'branch-updated';

/**
 * Central store tracking the active branch chain.
 *
 * The store exposes a simple observable API so UI surfaces (e.g. the sidebar
 * view) can stay in sync with note additions, removals, and reordering without
 * owning the data themselves.
 */
export class BranchStore {
    private entries: BranchEntry[] = [];
    private events = new Events();

    on(event: BranchEvent, callback: () => void): void {
        this.events.on(event, callback);
    }

    off(event: BranchEvent, callback: () => void): void {
        this.events.off(event, callback);
    }

    getBranch(): BranchEntry[] {
        return [...this.entries];
    }

    has(file: TFile): boolean {
        return this.entries.some(entry => entry.file.path === file.path);
    }

    add(file: TFile, index?: number): void {
        if (this.has(file)) {
            return;
        }
        const insertionIndex = index === undefined ? this.entries.length : index;
        this.entries.splice(insertionIndex, 0, { file });
        this.emitChange();
    }

    remove(path: string): void {
        const beforeLength = this.entries.length;
        this.entries = this.entries.filter(entry => entry.file.path !== path);
        if (this.entries.length !== beforeLength) {
            this.emitChange();
        }
    }

    clear(): void {
        if (this.entries.length === 0) {
            return;
        }
        this.entries = [];
        this.emitChange();
    }

    move(oldIndex: number, newIndex: number): void {
        if (oldIndex === newIndex) {
            return;
        }
        if (oldIndex < 0 || oldIndex >= this.entries.length) {
            return;
        }
        if (newIndex < 0 || newIndex >= this.entries.length) {
            return;
        }
        const [entry] = this.entries.splice(oldIndex, 1);
        this.entries.splice(newIndex, 0, entry);
        this.emitChange();
    }

    private emitChange(): void {
        this.events.trigger('branch-updated');
    }
}
