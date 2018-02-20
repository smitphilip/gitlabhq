import { sprintf, __ } from '../../../../locale';
import * as types from './mutation_types';
import * as consts from './constants';
import * as rootTypes from '../../mutation_types';
import { createCommitPayload, createNewMergeRequestUrl } from '../../utils';
import router from '../../../ide_router';
import service from '../../../services';
import flash from '../../../../flash';
import { stripHtml } from '../../../../lib/utils/text_utility';
import eventHub from '../../../eventhub';

export const updateCommitMessage = ({ commit }, message) => {
  commit(types.UPDATE_COMMIT_MESSAGE, message);
};

export const discardDraft = ({ commit }) => {
  commit(types.UPDATE_COMMIT_MESSAGE, '');
};

export const updateCommitAction = ({ commit }, commitAction) => {
  commit(types.UPDATE_COMMIT_ACTION, commitAction);
};

export const updateBranchName = ({ commit }, branchName) => {
  commit(types.UPDATE_NEW_BRANCH_NAME, branchName);
};

export const setLastCommitMessage = ({ commit }, data) => {
  const commitStats = data.stats ?
    sprintf(
      __('with %{additions} additions, %{deletions} deletions.'),
      { additions: data.stats.additions, deletions: data.stats.deletions },
    )
    : '';
  const commitMsg = sprintf(
    __('Your changes have been committed. Commit %{commitId} %{commitStats}'),
    {
      commitId: data.short_id,
      commitStats,
    },
  );

  commit(rootTypes.SET_LAST_COMMIT_MSG, commitMsg, { root: true });
};

export const checkCommitStatus = ({ rootState }) =>
  service
    .getBranchData(rootState.currentProjectId, rootState.currentBranchId)
    .then(({ data }) => {
      const { id } = data.commit;
      const selectedBranch =
        rootState.projects[rootState.currentProjectId].branches[rootState.currentBranchId];

      if (selectedBranch.workingReference !== id) {
        return true;
      }

      return false;
    })
    .catch(() => flash(__('Error checking branch data. Please try again.'), 'alert', document, null, false, true));

export const updateFilesAfterCommit = (
  { commit, dispatch, state, rootState, rootGetters },
  { data, branch },
) => {
  const selectedProject = rootState.projects[rootState.currentProjectId];
  const lastCommit = {
    commit_path: `${selectedProject.web_url}/commit/${data.id}`,
    commit: {
      id: data.id,
      message: data.message,
      authored_date: data.committed_date,
      author_name: data.committer_name,
    },
  };

  commit(rootTypes.SET_BRANCH_WORKING_REFERENCE, {
    projectId: rootState.currentProjectId,
    branchId: rootState.currentBranchId,
    reference: data.id,
  }, { root: true });

  rootState.changedFiles.forEach((entry) => {
    commit(rootTypes.SET_LAST_COMMIT_DATA, {
      entry,
      lastCommit,
    }, { root: true });

    commit(rootTypes.SET_FILE_RAW_DATA, {
      file: entry,
      raw: entry.content,
    }, { root: true });

    eventHub.$emit(`editor.update.model.content.${entry.path}`, entry.raw);
  });

  commit(rootTypes.REMOVE_ALL_CHANGES_FILES, null, { root: true });

  if (state.commitAction === consts.COMMIT_TO_NEW_BRANCH) {
    router.push(`/project/${rootState.currentProjectId}/blob/${branch}/${rootGetters.activeFile.path}`);
  }

  dispatch('updateCommitAction', consts.COMMIT_TO_CURRENT_BRANCH);
};

export const commitChanges = ({ commit, state, getters, dispatch, rootState }) => {
  const newBranch = state.commitAction !== consts.COMMIT_TO_CURRENT_BRANCH;
  const payload = createCommitPayload(getters.branchName, newBranch, state, rootState);
  const getCommitStatus = newBranch ? Promise.resolve(false) : dispatch('checkCommitStatus');

  commit(types.UPDATE_LOADING, true);

  return getCommitStatus.then(branchChanged => new Promise((resolve) => {
    if (branchChanged) {
      // show the modal with a Bootstrap call
      $('#ide-create-branch-modal').modal('show');
    } else {
      resolve();
    }
  }))
  .then(() => service.commit(rootState.currentProjectId, payload))
  .then(({ data }) => {
    commit(types.UPDATE_LOADING, false);

    if (!data.short_id) {
      flash(data.message, 'alert', document, null, false, true);
      return;
    }

    dispatch('setLastCommitMessage', data);

    if (state.commitAction === consts.COMMIT_TO_NEW_BRANCH_MR) {
      dispatch(
        'redirectToUrl',
        createNewMergeRequestUrl(
          rootState.projects[rootState.currentProjectId].web_url,
          getters.branchName,
          rootState.currentBranchId,
        ),
        { root: true },
      );
    } else {
      dispatch('updateFilesAfterCommit', { data, branch: getters.branchName });
    }
  })
  .catch((err) => {
    let errMsg = __('Error committing changes. Please try again.');
    if (err.response.data && err.response.data.message) {
      errMsg += ` (${stripHtml(err.response.data.message)})`;
    }
    flash(errMsg, 'alert', document, null, false, true);
    window.dispatchEvent(new Event('resize'));

    commit(types.UPDATE_LOADING, false);
  });
};
