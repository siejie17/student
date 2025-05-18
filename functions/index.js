const { onSchedule } = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.monthlyLeaderboardRefresh = onSchedule(
  {
    schedule: "0 0 1 * *",
    timeZone: "Asia/Kuala_Lumpur",
  },
  async (context) => {
    const leaderboardSnapshot = await db.collection("leaderboard").get();

    for (const doc of leaderboardSnapshot.docs) {
      const leaderboardDocRef = doc.ref;
      const { refreshDateTime } = doc.data();
      const currentTime = admin.firestore.Timestamp.now();

      if (!refreshDateTime || refreshDateTime.toMillis() > currentTime.toMillis()) continue;

      const entriesRef = leaderboardDocRef.collection("leaderboardEntries");
      const entriesSnap = await entriesRef.orderBy("points", "desc").get();

      const rankings = entriesSnap.docs.map((entryDoc, index) => {
        const data = entryDoc.data();
        const rank = index + 1;
        let diamonds = 1;

        if (rank === 1) diamonds = 1000;
        else if (rank === 2) diamonds = 750;
        else if (rank === 3) diamonds = 500;
        else if (rank === 4) diamonds = 400;
        else if (rank === 5) diamonds = 350;
        else if (rank === 6) diamonds = 300;
        else if (rank === 7) diamonds = 250;
        else if (rank === 8) diamonds = 200;
        else if (rank === 9) diamonds = 150;
        else if (rank === 10) diamonds = 100;
        else if (rank <= 20) diamonds = 50;
        else if (rank <= 30) diamonds = 25;
        else if (rank <= 40) diamonds = 10;
        else if (rank <= 50) diamonds = 5;

        return {
          rank,
          studentID: data.studentID,
          points: data.points,
          diamonds,
          claimed: false,
        };
      });

      const lastMonthRef = leaderboardDocRef.collection("lastMonth");
      const oldLastMonthSnap = await lastMonthRef.get();
      const deleteBatch = db.batch();
      oldLastMonthSnap.forEach((doc) => deleteBatch.delete(doc.ref));
      await deleteBatch.commit();

      const insertBatch = db.batch();
      rankings.forEach((entry) => {
        const newDoc = lastMonthRef.doc();
        insertBatch.set(newDoc, entry);
      });
      await insertBatch.commit();

      const deleteEntriesBatch = db.batch();
      entriesSnap.docs.forEach((doc) => deleteEntriesBatch.delete(doc.ref));
      await deleteEntriesBatch.commit();

      const nextDate = refreshDateTime.toDate();
      nextDate.setMonth(nextDate.getMonth() + 1);
      const newTimestamp = admin.firestore.Timestamp.fromDate(nextDate);
      await leaderboardDocRef.update({ refreshDateTime: newTimestamp });
    }

    logger.log("Monthly leaderboard refresh complete.");
    return null;
  }
);

exports.incrementUserYearly = onSchedule(
  {
    schedule: "0 0 1 10 *", // Every October 1st at midnight
    timeZone: "Asia/Kuala_Lumpur",
  },
  async (context) => {
    const usersRef = db.collection("user");
    const snapshot = await usersRef.get();

    const batch = db.batch();

    snapshot.forEach((doc) => {
      const userData = doc.data();
      const currentYear = userData.yearOfStudy ?? 1;
      const facultyID = userData.facultyID?.toString() ?? "";

      const maxYear = facultyID === "8" ? 5 : 4;

      if (typeof currentYear === "number" && currentYear < maxYear) {
        batch.update(doc.ref, { yearOfStudy: currentYear + 1 });
      }
    });

    await batch.commit();
    logger.log("User yearOfStudy incremented for eligible users.");
    return null;
  }
);
