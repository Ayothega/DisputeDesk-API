import { Injectable, BadRequestException } from "@nestjs/common"
import { DisputeStatus } from "@prisma/client"

export enum UserRole {
  AGENT = "AGENT",
  SUPERVISOR = "SUPERVISOR",
  SYSTEM = "SYSTEM",
}

interface TransitionRule {
  fromStates: DisputeStatus[]
  allowedRoles: UserRole[]
  description: string
}

interface StateTransitionMap {
  [status in DisputeStatus]?: TransitionRule
}

@Injectable()
export class DisputeStateMachine {
  private readonly transitionMap: Map<DisputeStatus, StateTransitionMap> = new Map([
    [
      DisputeStatus.OPEN,
      {
        IN_PROGRESS: {
          fromStates: [DisputeStatus.OPEN],
          allowedRoles: [UserRole.AGENT, UserRole.SUPERVISOR],
          description: "Agent or Supervisor can start investigating",
        },
        ESCALATED: {
          fromStates: [DisputeStatus.OPEN],
          allowedRoles: [UserRole.SUPERVISOR],
          description: "Only Supervisor can escalate from OPEN",
        },
        RESOLVED: {
          fromStates: [DisputeStatus.OPEN],
          allowedRoles: [UserRole.SUPERVISOR],
          description: "Only Supervisor can resolve directly from OPEN",
        },
      },
    ],
    [
      DisputeStatus.IN_PROGRESS,
      {
        ESCALATED: {
          fromStates: [DisputeStatus.IN_PROGRESS],
          allowedRoles: [UserRole.AGENT, UserRole.SUPERVISOR],
          description: "Agent or Supervisor can escalate during investigation",
        },
        RESOLVED: {
          fromStates: [DisputeStatus.IN_PROGRESS],
          allowedRoles: [UserRole.AGENT, UserRole.SUPERVISOR],
          description: "Agent or Supervisor can resolve",
        },
        OPEN: {
          fromStates: [DisputeStatus.IN_PROGRESS],
          allowedRoles: [UserRole.SUPERVISOR],
          description: "Supervisor can revert to OPEN if needed",
        },
      },
    ],
    [
      DisputeStatus.ESCALATED,
      {
        RESOLVED: {
          fromStates: [DisputeStatus.ESCALATED],
          allowedRoles: [UserRole.SUPERVISOR],
          description: "Supervisor can resolve escalated dispute",
        },
        IN_PROGRESS: {
          fromStates: [DisputeStatus.ESCALATED],
          allowedRoles: [UserRole.SUPERVISOR],
          description: "Supervisor can reassign back to investigation",
        },
      },
    ],
    [
      DisputeStatus.RESOLVED,
      {
        CLOSED: {
          fromStates: [DisputeStatus.RESOLVED],
          allowedRoles: [UserRole.SUPERVISOR],
          description: "Supervisor closes resolved dispute",
        },
        IN_PROGRESS: {
          fromStates: [DisputeStatus.RESOLVED],
          allowedRoles: [UserRole.SUPERVISOR],
          description: "Supervisor can reopen if new information emerges",
        },
      },
    ],
    [
      DisputeStatus.CLOSED,
      {
        RESOLVED: {
          fromStates: [DisputeStatus.CLOSED],
          allowedRoles: [UserRole.SUPERVISOR],
          description: "Supervisor can reopen closed dispute for review",
        },
      },
    ],
  ])

  validateTransition(fromState: DisputeStatus, toState: DisputeStatus, userRole: UserRole): void {
    if (fromState === toState) {
      throw new BadRequestException(`Cannot transition to the same state: ${fromState}`)
    }

    const transitionsFromState = this.transitionMap.get(fromState)
    if (!transitionsFromState) {
      throw new BadRequestException(`No transitions defined for state: ${fromState}`)
    }

    const rule = transitionsFromState[toState as DisputeStatus]
    if (!rule) {
      throw new BadRequestException(`Transition from ${fromState} to ${toState} is not allowed`)
    }

    if (!rule.allowedRoles.includes(userRole)) {
      throw new BadRequestException(
        `Role ${userRole} cannot perform transition from ${fromState} to ${toState}. ` +
          `Allowed roles: ${rule.allowedRoles.join(", ")}`,
      )
    }
  }

  getValidNextStates(currentState: DisputeStatus, userRole: UserRole): DisputeStatus[] {
    const transitionsFromState = this.transitionMap.get(currentState)
    if (!transitionsFromState) {
      return []
    }

    return Object.entries(transitionsFromState)
      .filter(([_, rule]) => rule.allowedRoles.includes(userRole))
      .map(([status]) => status as DisputeStatus)
  }

  canTransition(fromState: DisputeStatus, toState: DisputeStatus, userRole: UserRole): boolean {
    try {
      this.validateTransition(fromState, toState, userRole)
      return true
    } catch {
      return false
    }
  }

  getTransitionRule(fromState: DisputeStatus, toState: DisputeStatus): TransitionRule | null {
    const transitionsFromState = this.transitionMap.get(fromState)
    return transitionsFromState?.[toState as DisputeStatus] || null
  }
}
