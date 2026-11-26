Install the CLI
===============

.. test {"testId":"install-cli"}

Install the command-line tool with pip:

.. code-block:: bash

   pip install example-cli

.. step {"runShell":"pip install example-cli"}

Check that it installed:

.. code-block:: bash

   example-cli --version

.. step {"runShell":{"command":"example-cli --version","stdio":"/example-cli \\d+\\.\\d+\\.\\d+/"}}

The command prints the version, such as ``example-cli 2.4.1``.

Then sign in:

.. code-block:: bash

   example-cli login --token "$EXAMPLE_TOKEN"

.. step {"runShell":{"command":"example-cli login --token \"$EXAMPLE_TOKEN\"","stdio":"Signed in"}}

.. test end

The tool prints ``Signed in``.
