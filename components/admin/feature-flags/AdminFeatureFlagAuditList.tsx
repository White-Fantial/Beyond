import { prisma } from "@/lib/prisma";

interface Props {
  flagId: string;
}

export default async function AdminFeatureFlagAuditList({ flagId }: Props) {
  // Fetch direct flag logs (targetId = flagId) and assignment logs
  // where metadataJson.flagId references this flag.
  const logs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { targetType: "FeatureFlag", targetId: flagId },
        {
          targetType: "FeatureFlagAssignment",
          metadataJson: { path: ["flagId"], equals: flagId },
        },
      ],
    },
    include: { actorUser: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  if (logs.length === 0) {
    return <p className="text-sm text-gray-400">No change history.</p>;
  }

  return (
    <ul className="space-y-2">
      {logs.map((log) => (
        <li key={log.id} className="flex items-start gap-3 text-sm">
          <span className="text-gray-400 text-xs whitespace-nowrap mt-0.5">
            {log.createdAt.toLocaleString("en-US")}
          </span>
          <span className="font-mono text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded shrink-0">
            {log.action}
          </span>
          <span className="text-gray-500 text-xs">
            {log.actorUser?.name ?? log.actorUser?.email ?? "system"}
          </span>
        </li>
      ))}
    </ul>
  );
}
