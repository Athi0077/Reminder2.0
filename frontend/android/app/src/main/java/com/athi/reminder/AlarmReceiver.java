package com.athi.reminder;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String title = intent.getStringExtra("title");
        String description = intent.getStringExtra("description");
        String id = intent.getStringExtra("id");

        Log.d("AlarmReceiver", "Alarm received: " + title);

        Intent alarmIntent = new Intent(context, AlarmActivity.class);
        alarmIntent.putExtra("title", title);
        alarmIntent.putExtra("description", description);
        alarmIntent.putExtra("id", id);
        alarmIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        
        context.startActivity(alarmIntent);
    }
}
