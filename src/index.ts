import * as core from '@actions/core'
import * as github from '@actions/github'
import {Snapshot, Manifest, submitSnapshot} from '@github/dependency-submission-toolkit'

async function run(): Promise<void> {
    core.startGroup(`📘 Reading input values`);

    // Read input
    const testingAction = core.getMultilineInput('testing-action');

    // Verify inputs are valid
    if (testingAction.length === 0) {
        core.debug(`No 'testing-action' passed!`);
    }

    // Print debug
    core.debug(` 'testing-action' value is: ${testingAction}`);

    core.endGroup();
}

run()
