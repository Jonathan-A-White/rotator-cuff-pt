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
        // Needed when launching from a Capacitor plugin context
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        try {
            getActivity().startActivity(intent);

            // If we didn't skip the Clock UI, automatically return to our app
            // after a short delay so the user doesn't have to manually switch back.
            if (!skipUi) {
                getActivity().getWindow().getDecorView().postDelayed(() -> {
                    Intent back = new Intent(getContext(), getActivity().getClass());
                    back.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                    getContext().startActivity(back);
                }, 600);
            }

            call.resolve();
        } catch (Exception e) {
            call.reject("Could not start system timer: " + e.getMessage());
        }
    }
}
