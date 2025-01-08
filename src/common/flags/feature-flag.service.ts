import { Injectable } from "@nestjs/common";
import { FeatureFlag } from "common/flags/feature-flag.interface";
import * as admin from "firebase-admin";
import { FirestoreModel } from "common/gcp/firestore";

@Injectable()
export class FeatureFlagService {
  private get flags() {
    return admin.firestore().collection("flags") as FirestoreModel<FeatureFlag>;
  }
  async allFlags() {
    const allDocs = await this.flags.get();
    return allDocs.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        isEnabled: data.isEnabled,
      };
    });
  }

  async activate(name: string, enabled?: boolean): Promise<boolean> {
    const flags = await this.allFlags();
    const flagId = flags.filter((f) => f.name === name);
    if (flagId.length > 0) {
      await this.flags.doc(flagId[0].id).update({
        isEnabled: enabled ?? !flagId[0].isEnabled,
      });
      return true;
    }
    return false;
  }

  async patch(flags: FeatureFlag[]) {
    const flagDocs = await this.allFlags();
    const flagsByName = flagDocs.reduce(
      (acc, curr) => {
        acc[curr.name] = curr;
        return acc;
      },
      {} as { [name: string]: FeatureFlag & { id: string } },
    );

    await Promise.all(
      flags.map((flag) =>
        this.flags
          .doc(flagsByName[flag.name].id)
          .update({ isEnabled: flag.isEnabled }),
      ),
    );
  }
}
