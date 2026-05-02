import { db } from './db'

export async function getTeamUserIds(userId: string): Promise<string[]> {
  const member = await db.teamMember.findUnique({
    where: { userId },
    include: {
      team: { include: { members: { select: { userId: true } } } },
    },
  })
  if (!member) return [userId]
  return member.team.members.map((m) => m.userId)
}

export async function getOrCreateTeam(userId: string, teamName?: string) {
  const existing = await db.teamMember.findUnique({
    where: { userId },
    include: { team: { include: { members: { include: { user: { select: { id: true, name: true, email: true, jobTitle: true } } } }, invites: { where: { acceptedAt: null, expiresAt: { gt: new Date() } } } } } },
  })
  if (existing) return existing.team

  const user = await db.user.findUnique({ where: { id: userId }, select: { name: true, email: true, businessName: true } })
  const name = teamName || user?.businessName || user?.name?.split(' ')[0] + "'s Team" || 'My Team'

  const team = await db.team.create({
    data: {
      name,
      members: { create: { userId, role: 'OWNER' } },
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, jobTitle: true } } } },
      invites: { where: { acceptedAt: null, expiresAt: { gt: new Date() } } },
    },
  })
  return team
}
