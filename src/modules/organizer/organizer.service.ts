import { Injectable } from "@nestjs/common";
import { FirebaseAuthService } from "common/gcp";
import { Organizer } from "entities/organizer.entity";
import { from, map, mergeMap } from "rxjs";

@Injectable()
export class OrganizerService {
  constructor(private readonly auth: FirebaseAuthService) {}

  /**
   * Inject organizer roles into organizer objects
   * @param organizers
   * @return Observable that emits one organizer at a time. Should use toArray()
   * to concat all elements into an array.
   */
  injectUserRoles(organizers: Organizer[]) {
    return from(organizers).pipe(
      mergeMap((organizer) =>
        from(this.auth.getUserPrivilegeFromUid(organizer.id)).pipe(
          map((privilege) => {
            organizer.privilege = privilege;
            return organizer;
          }),
        ),
      ),
    );
  }
}
