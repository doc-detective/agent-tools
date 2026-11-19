# Check system health

Before you start a working session, confirm that the demo app's services are
healthy. The health dashboard does this check for you every time it loads.

## View the health dashboard

1. Go to `http://localhost:8092/waitUntil-test-late-element.html`.

   The page opens with some placeholder content while it contacts the backend
   services.

2. Give the dashboard a moment to load. You'll know it's ready when its tile
   appears in the content area.

3. Read the status line under the tile. If the services are healthy, it tells you
   the system is operational.

If the status line reports anything else, stop and check the service status page
before you continue.
