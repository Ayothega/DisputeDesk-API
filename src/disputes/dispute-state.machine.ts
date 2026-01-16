import { Injectable, BadRequestException } from "@nestjs/common"
import { DisputeStatus, UserRole, ActorType } from "./enums/dispute-status.enum"

interface TransitionRule {
  fromStates: DisputeStatus[]
  allowedRoles: UserRole[]
  allowedActorTypes: ActorType[]
}

@Injectable()
export class DisputeStateMachine {
  private readonly transitionRules: Map<DisputeStatus, TransitionRule> = new Map([
    [
      DisputeStatus.NEW,
      {
        fromStates: [DisputeStatus.NEW],
        allowedRoles: [UserRole.AGENT, UserRole.SUPERVISOR],
        allowedActorTypes: [ActorType.AGENT, ActorType.SYSTEM],
      },
    ],
    [
      DisputeStatus.UNDER_REVIEW,
      {
        fromStates: [DisputeStatus.NEW],
        allowedRoles: [UserRole.AGENT, UserRole.SUPERVISOR],
        allowedActorTypes: [ActorType.AGENT, ActorType.SYSTEM],
      },
    ],
    [
      DisputeStatus.WAITING_FOR_CUSTOMER,
      {
        fromStates: [DisputeStatus.UNDER_REVIEW],
        allowedRoles: [UserRole.AGENT, UserRole.SUPERVISOR],
        allowedActorTypes: [ActorType.AGENT, ActorType.SYSTEM],
      },
    ],
    [
      DisputeStatus.ESCALATED,
      {
        fromStates: [DisputeStatus.UNDER_REVIEW, DisputeStatus.WAITING_FOR_CUSTOMER],
        allowedRoles: [UserRole.SUPERVISOR],
        allowedActorTypes: [ActorType.AGENT, ActorType.SYSTEM],
      },
    ],
    [
      DisputeStatus.RESOLVED,
      {
        fromStates: [DisputeStatus.UNDER_REVIEW, DisputeStatus.WAITING_FOR_CUSTOMER, DisputeStatus.ESCALATED],
        allowedRoles: [UserRole.AGENT, UserRole.SUPERVISOR],
        allowedActorTypes: [ActorType.AGENT, ActorType.SYSTEM],
      },
    ],
    [
      DisputeStatus.CLOSED,
      {
        fromStates: [DisputeStatus.RESOLVED, DisputeStatus.ESCALATED],
        allowedRoles: [UserRole.SUPERVISOR],
        allowedActorTypes: [ActorType.AGENT, ActorType.SYSTEM],
      },
    ],
  ])

  canTransition(
    fromState: DisputeStatus,
    toState: DisputeStatus,
    userRole: UserRole,
    actorType: ActorType = ActorType.AGENT,
  ): boolean {
    const rule = this.transitionRules.get(toState)

    if (!rule) {
      throw new BadRequestException(`Invalid target state: ${toState}`)
    }

    const isValidTransition = rule.fromStates.includes(fromState)
    const isValidRole = rule.allowedRoles.includes(userRole)
    const isValidActorType = rule.allowedActorTypes.includes(actorType)

    return isValidTransition && isValidRole && isValidActorType
  }

  validateTransition(
    fromState: DisputeStatus,
    toState: DisputeStatus,
    userRole: UserRole,
    actorType: ActorType = ActorType.AGENT,
  ): void {
    if (fromState === toState) {
      throw new BadRequestException("Cannot transition to the same state")
    }

    if (!this.canTransition(fromState, toState, userRole, actorType)) {
      throw new BadRequestException(`Transition from ${fromState} to ${toState} is not allowed for role ${userRole}`)
    }
  }
}
