export type WorkspaceContext = {
    id: string;
    label: string;
    round: string;
    school: string;
    assigned: number;
    total: number;
    feedback: number;
};

export type WorkspacePreview = {
    contexts: WorkspaceContext[];
    account: { name: string; email: string; role: string; roleCode: string };
};
