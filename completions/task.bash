_uispecpilot_task_completion() {
  local cur prev words cword
  if declare -F _init_completion >/dev/null 2>&1; then
    _init_completion || return
  else
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD - 1]}"
    words=("${COMP_WORDS[@]}")
    cword="${COMP_CWORD}"
  fi

  local commands="help create-spec edit-spec semantic-review flutter-codegen"

  case "${COMP_CWORD}" in
    1)
      COMPREPLY=( $(compgen -W "${commands}" -- "${cur}") )
      return
      ;;
  esac

  case "${COMP_WORDS[1]}" in
    edit-spec)
      if [[ "${COMP_CWORD}" -eq 2 ]]; then
        COMPREPLY=( $(compgen -f -X '!*.json' -- "${cur}") )
      fi
      ;;
    semantic-review)
      if [[ "${COMP_CWORD}" -eq 2 ]]; then
        COMPREPLY=( $(compgen -f -X '!*.json' -- "${cur}") )
      fi
      ;;
    flutter-codegen)
      if [[ "${COMP_CWORD}" -eq 2 ]]; then
        COMPREPLY=( $(compgen -f -X '!*.json' -- "${cur}") )
      elif [[ "${COMP_CWORD}" -eq 3 ]]; then
        COMPREPLY=( $(compgen -d -- "${cur}") )
      fi
      ;;
    help|create-spec)
      ;;
  esac
}

complete -F _uispecpilot_task_completion ./task
complete -F _uispecpilot_task_completion task
