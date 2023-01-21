import { Injectable } from "@nestjs/common";
import * as admin from "firebase-admin";
import {
  DefaultTopic,
  Payload,
} from "common/firebase/messaging/firebase-messaging.types";
import {
  FirestoreModel,
  InjectFirestoreModel,
} from "common/firebase/firestore";
import { catchError, from, map, Observable } from "rxjs";
import { FirestoreUser } from "entities/firestore-user.entity";

@Injectable()
export class FirebaseMessagingService {
  constructor(
    @InjectFirestoreModel(FirestoreUser)
    private readonly users: FirestoreModel<FirestoreUser>,
  ) {}

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

  private getFcmToken(pin: string): Observable<string | null> {
    return from(this.users.doc(pin).get()).pipe(
      map((user) => user.get("token")),
      catchError(() => null),
    );
  }

  private static _createDataPayload(
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

  async sendTokenMessage(userPin: string, payload: Payload) {
    const { title, scheduleTime, data, body, isClickable } = payload;

    const payloadData = FirebaseMessagingService._createDataPayload(
      data,
      scheduleTime,
    );

    from(this.getFcmToken(userPin)).pipe(
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

    const payloadData = FirebaseMessagingService._createDataPayload(
      data,
      scheduleTime,
    );

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
}
