export interface ProjectDto {
    id: string;
    clientId: string;
    clientName?: string;
    name: string;
    url: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
}
export interface ProjectWithLastAudit extends ProjectDto {
    lastAudit?: {
        auditId: string;
        scoreSeo: number | null;
        scorePerf: number | null;
        completedAt: string | null;
    };
}
//# sourceMappingURL=project.d.ts.map