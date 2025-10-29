import { ItemView, WorkspaceLeaf, setIcon } from 'obsidian';
import SynapsePlugin from '../main';
import { BranchStore, BranchEntry } from './branchStore';

export const SYNAPSE_BRANCH_VIEW_TYPE = 'synapse-branch-view';

/**
 * Dockable sidebar view showing the active branch chain.
 */
export class BranchSidebarView extends ItemView {
    private plugin: SynapsePlugin;
    private branchStore: BranchStore;
    private container!: HTMLElement;
    private unsubscribe?: () => void;

    constructor(leaf: WorkspaceLeaf, plugin: SynapsePlugin) {
        super(leaf);
        this.plugin = plugin;
        this.branchStore = plugin.branchStore;
    }

    getViewType(): string {
        return SYNAPSE_BRANCH_VIEW_TYPE;
    }

    getDisplayText(): string {
        return 'Synapse Branch';
    }

    getIcon(): string {
        return 'git-branch';
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('synapse-plugin');
        contentEl.addClass('synapse-branch-sidebar');

        this.container = contentEl.createDiv({ cls: 'synapse-branch-sidebar__content' });
        this.renderBranch();

        const listener = () => this.renderBranch();
        this.branchStore.on('branch-updated', listener);
        this.unsubscribe = () => this.branchStore.off('branch-updated', listener);
    }

    async onClose() {
        this.unsubscribe?.();
        this.contentEl.empty();
    }

    private renderBranch() {
        this.container.empty();
        const entries = this.branchStore.getBranch();

        const header = this.container.createDiv({ cls: 'synapse-branch-sidebar__header' });
        header.createEl('h3', { text: 'Branch context' });

        const clearButton = header.createEl('button', { cls: 'synapse-branch-sidebar__clear', text: 'Clear' });
        setIcon(clearButton, 'trash');
        clearButton.onclick = () => this.branchStore.clear();

        if (entries.length === 0) {
            const emptyState = this.container.createDiv({ cls: 'synapse-branch-sidebar__empty' });
            emptyState.setText('Branch is empty. Add notes via links or command palette.');
            return;
        }

        const list = this.container.createEl('ul', { cls: 'synapse-branch-sidebar__list' });
        entries.forEach((entry, index) => {
            list.appendChild(this.createListItem(entry, index, entries.length));
        });
    }

    private createListItem(entry: BranchEntry, index: number, length: number): HTMLElement {
        const li = document.createElement('li');
        li.className = 'synapse-branch-sidebar__item';
        li.draggable = true;
        li.dataset.index = String(index);

        const dragHandle = li.createDiv({ cls: 'synapse-branch-sidebar__drag' });
        setIcon(dragHandle, 'grip-vertical');

        const title = li.createDiv({ cls: 'synapse-branch-sidebar__title' });
        title.setText(entry.file.basename);
        title.onclick = () => this.plugin.app.workspace.openLinkText(entry.file.basename, entry.file.path, false);

        const removeButton = li.createEl('button', { cls: 'synapse-branch-sidebar__remove' });
        setIcon(removeButton, 'x');
        removeButton.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.branchStore.remove(entry.file.path);
        };

        this.attachDragHandlers(li, length);
        return li;
    }

    private attachDragHandlers(element: HTMLElement, length: number) {
        element.addEventListener('dragstart', (event) => {
            element.classList.add('is-dragging');
            event.dataTransfer?.setData('text/plain', element.dataset.index || '0');
            event.dataTransfer?.setDragImage(element, 0, 0);
        });

        element.addEventListener('dragend', () => {
            element.classList.remove('is-dragging');
        });

        element.addEventListener('dragover', (event) => {
            event.preventDefault();
            element.classList.add('is-drop-target');
        });

        element.addEventListener('dragleave', () => {
            element.classList.remove('is-drop-target');
        });

        element.addEventListener('drop', (event) => {
            event.preventDefault();
            element.classList.remove('is-drop-target');

            const fromIndex = Number(event.dataTransfer?.getData('text/plain') ?? -1);
            const toIndex = Number(element.dataset.index ?? -1);
            if (!Number.isNaN(fromIndex) && !Number.isNaN(toIndex) && fromIndex >= 0 && toIndex >= 0 && toIndex < length) {
                this.branchStore.move(fromIndex, toIndex);
            }
        });
    }
}
