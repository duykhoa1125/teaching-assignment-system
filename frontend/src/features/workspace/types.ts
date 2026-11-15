export type WorkspacePreview = {
    contexts: {
        id: string;
        label: string;
        round: string;
        school: string;
        assigned: number;
        total: number;
        feedback: number;
    }[];
    account: { name: string; email: string; role: string; roleCode: string };
};
