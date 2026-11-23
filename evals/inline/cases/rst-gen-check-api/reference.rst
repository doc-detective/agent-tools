Check a local API
=================

These steps check your tools, then send two requests to the demo API at
``http://localhost:8093``.

Check your tools
----------------

.. test {"testId":"check-api"}

Check your Node.js version::

   node --version

.. step {"runShell":{"command":"node --version","stdio":"/v\\d+\\.\\d+\\.\\d+/"}}

The command prints a version such as ``v22.11.0``.

Check the API
-------------

Send a ``GET`` request to ``http://localhost:8093/api/status``. The API
answers with ``200 OK``.

.. step {"httpRequest":{"url":"http://localhost:8093/api/status","method":"get","statusCodes":[200]}}

Register a webhook
------------------

Register a webhook for deploy events:

.. code-block:: bash

   curl -X POST http://localhost:8093/api/webhooks \
     -H "Content-Type: application/json" \
     -d '{"url": "http://localhost:4000/hook", "events": ["deploy"]}'

.. step {"httpRequest":{"url":"http://localhost:8093/api/webhooks","method":"post","request":{"headers":{"Content-Type":"application/json"},"body":{"url":"http://localhost:4000/hook","events":["deploy"]}},"statusCodes":[200],"response":{"body":{"url":"http://localhost:4000/hook","events":["deploy"]}}}}

.. test end

The API echoes the body back.

.. note::

   To list your webhooks later, send a ``GET`` request to
   ``http://localhost:8093/api/webhooks``.
