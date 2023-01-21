import { Injectable } from "@nestjs/common";
import { FirebaseAuthService } from "common/firebase";
import { Organizer } from "entities/organizer.entity";
import { from, map, mergeMap, Observable } from "rxjs";

@Injectable()
export class OrganizerService {
  constructor(private readonly auth: FirebaseAuthService) {}

  injectUserRoles(organizers: Organizer[]) {
    return from(organizers).pipe(
      mergeMap((organizer) =>
        from(this.auth.getUserPrivilege(organizer.id)).pipe(
          map((privilege) => {
            organizer.privilege = privilege;
            return organizer;
          }),
        ),
      ),
    );
  }
}
