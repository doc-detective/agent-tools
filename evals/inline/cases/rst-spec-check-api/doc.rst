Check a local API
=================

These steps check your tools, then send two requests to the demo API at
``http://localhost:8093``.

Check your tools
----------------

Check your Node.js version::

   node --version

The command prints a version such as ``v22.11.0``.

Check the API
-------------

Send a ``GET`` request to ``http://localhost:8093/api/status``. The API
answers with ``200 OK``.

Register a webhook
------------------

Register a webhook for deploy events:

.. code-block:: bash

   curl -X POST http://localhost:8093/api/webhooks \
     -H "Content-Type: application/json" \
     -d '{"url": "http://localhost:4000/hook", "events": ["deploy"]}'

The API echoes the body back.

.. note::

   To list your webhooks later, send a ``GET`` request to
   ``http://localhost:8093/api/webhooks``.
