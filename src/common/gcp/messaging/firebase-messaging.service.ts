import { Injectable } from "@nestjs/common";
import * as admin from "firebase-admin";
import {
  DefaultTopic,
  Payload,
} from "common/gcp/messaging/firebase-messaging.types";
import { FirestoreModel } from "common/gcp/firestore";
import { catchError, from, map, Observable } from "rxjs";
import { FirestoreUser } from "entities/firestore-user.entity";
import { DateTime } from "luxon";

@Injectable()
export class FirebaseMessagingService {
  private get users(): FirestoreModel<FirestoreUser> {
    return admin
      .firestore()
      .collection("users") as FirestoreModel<FirestoreUser>;
  }

  private static _clickableNotification = {
    android: {
      notification: {
        clickAction: "FLUTTER_NOTIFICATION_CLICK",
      },
    },
    apns: {
      payload: {
        aps: {
          category: "MESSAGE_LINK",
        },
      },
    },
  };

  private getFcmToken(userId: string): Observable<string | null> {
    return from(this.users.doc(userId).get()).pipe(
      map((user) => user.get("token")),
      catchError(() => null),
    );
  }

  private createDataPayload(
    data?: Record<string, string>,
    scheduleTime?: number,
  ) {
    return {
      ...(data ? data : {}),
      ...(scheduleTime
        ? {
            scheduleTime: scheduleTime.toString(),
            isScheduled: "true",
          }
        : {}),
    };
  }

  async sendTokenMessage(userId: string, payload: Payload) {
    const { title, scheduleTime, data, body, isClickable } = payload;

    const payloadData = this.createDataPayload(data, scheduleTime);

    from(this.getFcmToken(userId)).pipe(
      map<string, admin.messaging.TokenMessage>((token) => ({
        token,
        data: payloadData,
        ...(isClickable ? FirebaseMessagingService._clickableNotification : {}),
        notification: {
          title,
          body,
        },
      })),
      map((message) => admin.messaging().send(message)),
    );
  }

  async sendTopicMessage(topic: DefaultTopic | string, payload: Payload) {
    const { title, body, isClickable, scheduleTime, data } = payload;

    const payloadData = this.createDataPayload(data, scheduleTime);

    const message: admin.messaging.TopicMessage = {
      ...(isClickable ? FirebaseMessagingService._clickableNotification : {}),
      data: payloadData,
      topic,
      notification: {
        title,
        body,
      },
    };

    await admin.messaging().send(message);
  }

  async register(userId: string, fcmToken: string, topic: DefaultTopic) {
    await this.users.doc(userId).set({
      token: fcmToken,
      updatedAt: DateTime.now().toUnixInteger(),
    });

    await admin.messaging().subscribeToTopic(fcmToken, topic);
  }
}
