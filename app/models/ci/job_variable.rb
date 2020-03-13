# frozen_string_literal: true

module Ci
  class JobVariable < ApplicationRecord
    extend Gitlab::Ci::Model
    include NewHasVariable
    include BulkInsertSafe

    belongs_to :job, class_name: "Ci::Build", foreign_key: :job_id

    alias_attribute :secret_value, :value

    validates :key, uniqueness: { scope: :job_id }, unless: :dotenv_source?

    enum source: { internal: 0, dotenv: 1 }, _suffix: true
  end
end
