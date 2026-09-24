package com.athi.reminder;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "AlarmPlugin")
public class AlarmPlugin extends Plugin {

    @PluginMethod
    public void scheduleAlarm(PluginCall call) {
        String idStr = call.getString("id");
        Long time = call.getLong("time");
        String title = call.getString("title", "Reminder");
        String description = call.getString("description", "");

        if (idStr == null || time == null) {
            call.reject("Must provide id and time");
            return;
        }

        int id = Math.abs(idStr.hashCode()); // Convert string ID to int for PendingIntent

        Context context = getContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.putExtra("id", idStr);
        intent.putExtra("title", title);
        intent.putExtra("description", description);

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context, id, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, time, pendingIntent);
                } else {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, time, pendingIntent);
                }
            } else {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, time, pendingIntent);
            }
            saveAlarmToPrefs(context, idStr, time, title, description);
            call.resolve();
        } catch (SecurityException e) {
            call.reject("Permission to schedule exact alarms is required", e);
        }
    }

    @PluginMethod
    public void cancelAlarm(PluginCall call) {
        String idStr = call.getString("id");
        if (idStr == null) {
            call.reject("Must provide id");
            return;
        }

        int id = Math.abs(idStr.hashCode());
        Context context = getContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        Intent intent = new Intent(context, AlarmReceiver.class);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context, id, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        if (alarmManager != null) {
            alarmManager.cancel(pendingIntent);
        }
        removeAlarmFromPrefs(context, idStr);
        call.resolve();
    }

    private void saveAlarmToPrefs(Context context, String idStr, long time, String title, String description) {
        SharedPreferences prefs = context.getSharedPreferences("AlarmPrefs", Context.MODE_PRIVATE);
        String alarmsJson = prefs.getString("alarms", "[]");
        try {
            JSONArray alarms = new JSONArray(alarmsJson);
            // Remove existing
            JSONArray newAlarms = new JSONArray();
            for (int i = 0; i < alarms.length(); i++) {
                if (!alarms.getJSONObject(i).getString("idStr").equals(idStr)) {
                    newAlarms.put(alarms.getJSONObject(i));
                }
            }
            JSONObject newAlarm = new JSONObject();
            newAlarm.put("idStr", idStr);
            newAlarm.put("time", time);
            newAlarm.put("title", title);
            newAlarm.put("description", description);
            newAlarms.put(newAlarm);
            
            prefs.edit().putString("alarms", newAlarms.toString()).apply();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void removeAlarmFromPrefs(Context context, String idStr) {
        SharedPreferences prefs = context.getSharedPreferences("AlarmPrefs", Context.MODE_PRIVATE);
        String alarmsJson = prefs.getString("alarms", "[]");
        try {
            JSONArray alarms = new JSONArray(alarmsJson);
            JSONArray newAlarms = new JSONArray();
            for (int i = 0; i < alarms.length(); i++) {
                if (!alarms.getJSONObject(i).getString("idStr").equals(idStr)) {
                    newAlarms.put(alarms.getJSONObject(i));
                }
            }
            prefs.edit().putString("alarms", newAlarms.toString()).apply();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
