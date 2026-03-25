package com.rotatorpt.app;

import android.content.Intent;
import android.provider.AlarmClock;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SystemTimer")
public class SystemTimerPlugin extends Plugin {

    @PluginMethod()
    public void setTimer(PluginCall call) {
        int seconds = call.getInt("seconds", 0);
        String label = call.getString("label", "Exercise Timer");
        boolean skipUi = call.getBoolean("skipUi", true);

        if (seconds <= 0) {
            call.reject("Timer seconds must be greater than 0");
            return;
        }

        Intent intent = new Intent(AlarmClock.ACTION_SET_TIMER);
        intent.putExtra(AlarmClock.EXTRA_LENGTH, seconds);
        intent.putExtra(AlarmClock.EXTRA_MESSAGE, label);
        intent.putExtra(AlarmClock.EXTRA_SKIP_UI, skipUi);

        try {
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not start system timer: " + e.getMessage());
        }
    }
}
