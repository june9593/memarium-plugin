#!/usr/bin/env node
import{createRequire}from'module';const require=createRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x2) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x2, {
  get: (a, b2) => (typeof require !== "undefined" ? require : a)[b2]
}) : x2)(function(x2) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x2 + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/commander/lib/error.js
var require_error = __commonJS({
  "node_modules/commander/lib/error.js"(exports) {
    var CommanderError2 = class extends Error {
      /**
       * Constructs the CommanderError class
       * @param {number} exitCode suggested exit code which could be used with process.exit
       * @param {string} code an id string representing the error
       * @param {string} message human-readable description of the error
       */
      constructor(exitCode, code, message) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.code = code;
        this.exitCode = exitCode;
        this.nestedError = void 0;
      }
    };
    var InvalidArgumentError2 = class extends CommanderError2 {
      /**
       * Constructs the InvalidArgumentError class
       * @param {string} [message] explanation of why argument is invalid
       */
      constructor(message) {
        super(1, "commander.invalidArgument", message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
      }
    };
    exports.CommanderError = CommanderError2;
    exports.InvalidArgumentError = InvalidArgumentError2;
  }
});

// node_modules/commander/lib/argument.js
var require_argument = __commonJS({
  "node_modules/commander/lib/argument.js"(exports) {
    var { InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var Argument2 = class {
      /**
       * Initialize a new command argument with the given name and description.
       * The default is that the argument is required, and you can explicitly
       * indicate this with <> around the name. Put [] around the name for an optional argument.
       *
       * @param {string} name
       * @param {string} [description]
       */
      constructor(name, description) {
        this.description = description || "";
        this.variadic = false;
        this.parseArg = void 0;
        this.defaultValue = void 0;
        this.defaultValueDescription = void 0;
        this.argChoices = void 0;
        switch (name[0]) {
          case "<":
            this.required = true;
            this._name = name.slice(1, -1);
            break;
          case "[":
            this.required = false;
            this._name = name.slice(1, -1);
            break;
          default:
            this.required = true;
            this._name = name;
            break;
        }
        if (this._name.length > 3 && this._name.slice(-3) === "...") {
          this.variadic = true;
          this._name = this._name.slice(0, -3);
        }
      }
      /**
       * Return argument name.
       *
       * @return {string}
       */
      name() {
        return this._name;
      }
      /**
       * @package
       */
      _concatValue(value, previous) {
        if (previous === this.defaultValue || !Array.isArray(previous)) {
          return [value];
        }
        return previous.concat(value);
      }
      /**
       * Set the default value, and optionally supply the description to be displayed in the help.
       *
       * @param {*} value
       * @param {string} [description]
       * @return {Argument}
       */
      default(value, description) {
        this.defaultValue = value;
        this.defaultValueDescription = description;
        return this;
      }
      /**
       * Set the custom handler for processing CLI command arguments into argument values.
       *
       * @param {Function} [fn]
       * @return {Argument}
       */
      argParser(fn) {
        this.parseArg = fn;
        return this;
      }
      /**
       * Only allow argument value to be one of choices.
       *
       * @param {string[]} values
       * @return {Argument}
       */
      choices(values) {
        this.argChoices = values.slice();
        this.parseArg = (arg, previous) => {
          if (!this.argChoices.includes(arg)) {
            throw new InvalidArgumentError2(
              `Allowed choices are ${this.argChoices.join(", ")}.`
            );
          }
          if (this.variadic) {
            return this._concatValue(arg, previous);
          }
          return arg;
        };
        return this;
      }
      /**
       * Make argument required.
       *
       * @returns {Argument}
       */
      argRequired() {
        this.required = true;
        return this;
      }
      /**
       * Make argument optional.
       *
       * @returns {Argument}
       */
      argOptional() {
        this.required = false;
        return this;
      }
    };
    function humanReadableArgName(arg) {
      const nameOutput = arg.name() + (arg.variadic === true ? "..." : "");
      return arg.required ? "<" + nameOutput + ">" : "[" + nameOutput + "]";
    }
    exports.Argument = Argument2;
    exports.humanReadableArgName = humanReadableArgName;
  }
});

// node_modules/commander/lib/help.js
var require_help = __commonJS({
  "node_modules/commander/lib/help.js"(exports) {
    var { humanReadableArgName } = require_argument();
    var Help2 = class {
      constructor() {
        this.helpWidth = void 0;
        this.sortSubcommands = false;
        this.sortOptions = false;
        this.showGlobalOptions = false;
      }
      /**
       * Get an array of the visible subcommands. Includes a placeholder for the implicit help command, if there is one.
       *
       * @param {Command} cmd
       * @returns {Command[]}
       */
      visibleCommands(cmd) {
        const visibleCommands = cmd.commands.filter((cmd2) => !cmd2._hidden);
        const helpCommand = cmd._getHelpCommand();
        if (helpCommand && !helpCommand._hidden) {
          visibleCommands.push(helpCommand);
        }
        if (this.sortSubcommands) {
          visibleCommands.sort((a, b2) => {
            return a.name().localeCompare(b2.name());
          });
        }
        return visibleCommands;
      }
      /**
       * Compare options for sort.
       *
       * @param {Option} a
       * @param {Option} b
       * @returns {number}
       */
      compareOptions(a, b2) {
        const getSortKey = (option) => {
          return option.short ? option.short.replace(/^-/, "") : option.long.replace(/^--/, "");
        };
        return getSortKey(a).localeCompare(getSortKey(b2));
      }
      /**
       * Get an array of the visible options. Includes a placeholder for the implicit help option, if there is one.
       *
       * @param {Command} cmd
       * @returns {Option[]}
       */
      visibleOptions(cmd) {
        const visibleOptions = cmd.options.filter((option) => !option.hidden);
        const helpOption = cmd._getHelpOption();
        if (helpOption && !helpOption.hidden) {
          const removeShort = helpOption.short && cmd._findOption(helpOption.short);
          const removeLong = helpOption.long && cmd._findOption(helpOption.long);
          if (!removeShort && !removeLong) {
            visibleOptions.push(helpOption);
          } else if (helpOption.long && !removeLong) {
            visibleOptions.push(
              cmd.createOption(helpOption.long, helpOption.description)
            );
          } else if (helpOption.short && !removeShort) {
            visibleOptions.push(
              cmd.createOption(helpOption.short, helpOption.description)
            );
          }
        }
        if (this.sortOptions) {
          visibleOptions.sort(this.compareOptions);
        }
        return visibleOptions;
      }
      /**
       * Get an array of the visible global options. (Not including help.)
       *
       * @param {Command} cmd
       * @returns {Option[]}
       */
      visibleGlobalOptions(cmd) {
        if (!this.showGlobalOptions) return [];
        const globalOptions = [];
        for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
          const visibleOptions = ancestorCmd.options.filter(
            (option) => !option.hidden
          );
          globalOptions.push(...visibleOptions);
        }
        if (this.sortOptions) {
          globalOptions.sort(this.compareOptions);
        }
        return globalOptions;
      }
      /**
       * Get an array of the arguments if any have a description.
       *
       * @param {Command} cmd
       * @returns {Argument[]}
       */
      visibleArguments(cmd) {
        if (cmd._argsDescription) {
          cmd.registeredArguments.forEach((argument) => {
            argument.description = argument.description || cmd._argsDescription[argument.name()] || "";
          });
        }
        if (cmd.registeredArguments.find((argument) => argument.description)) {
          return cmd.registeredArguments;
        }
        return [];
      }
      /**
       * Get the command term to show in the list of subcommands.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      subcommandTerm(cmd) {
        const args = cmd.registeredArguments.map((arg) => humanReadableArgName(arg)).join(" ");
        return cmd._name + (cmd._aliases[0] ? "|" + cmd._aliases[0] : "") + (cmd.options.length ? " [options]" : "") + // simplistic check for non-help option
        (args ? " " + args : "");
      }
      /**
       * Get the option term to show in the list of options.
       *
       * @param {Option} option
       * @returns {string}
       */
      optionTerm(option) {
        return option.flags;
      }
      /**
       * Get the argument term to show in the list of arguments.
       *
       * @param {Argument} argument
       * @returns {string}
       */
      argumentTerm(argument) {
        return argument.name();
      }
      /**
       * Get the longest command term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestSubcommandTermLength(cmd, helper) {
        return helper.visibleCommands(cmd).reduce((max, command) => {
          return Math.max(max, helper.subcommandTerm(command).length);
        }, 0);
      }
      /**
       * Get the longest option term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestOptionTermLength(cmd, helper) {
        return helper.visibleOptions(cmd).reduce((max, option) => {
          return Math.max(max, helper.optionTerm(option).length);
        }, 0);
      }
      /**
       * Get the longest global option term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestGlobalOptionTermLength(cmd, helper) {
        return helper.visibleGlobalOptions(cmd).reduce((max, option) => {
          return Math.max(max, helper.optionTerm(option).length);
        }, 0);
      }
      /**
       * Get the longest argument term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestArgumentTermLength(cmd, helper) {
        return helper.visibleArguments(cmd).reduce((max, argument) => {
          return Math.max(max, helper.argumentTerm(argument).length);
        }, 0);
      }
      /**
       * Get the command usage to be displayed at the top of the built-in help.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      commandUsage(cmd) {
        let cmdName = cmd._name;
        if (cmd._aliases[0]) {
          cmdName = cmdName + "|" + cmd._aliases[0];
        }
        let ancestorCmdNames = "";
        for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
          ancestorCmdNames = ancestorCmd.name() + " " + ancestorCmdNames;
        }
        return ancestorCmdNames + cmdName + " " + cmd.usage();
      }
      /**
       * Get the description for the command.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      commandDescription(cmd) {
        return cmd.description();
      }
      /**
       * Get the subcommand summary to show in the list of subcommands.
       * (Fallback to description for backwards compatibility.)
       *
       * @param {Command} cmd
       * @returns {string}
       */
      subcommandDescription(cmd) {
        return cmd.summary() || cmd.description();
      }
      /**
       * Get the option description to show in the list of options.
       *
       * @param {Option} option
       * @return {string}
       */
      optionDescription(option) {
        const extraInfo = [];
        if (option.argChoices) {
          extraInfo.push(
            // use stringify to match the display of the default value
            `choices: ${option.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`
          );
        }
        if (option.defaultValue !== void 0) {
          const showDefault = option.required || option.optional || option.isBoolean() && typeof option.defaultValue === "boolean";
          if (showDefault) {
            extraInfo.push(
              `default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`
            );
          }
        }
        if (option.presetArg !== void 0 && option.optional) {
          extraInfo.push(`preset: ${JSON.stringify(option.presetArg)}`);
        }
        if (option.envVar !== void 0) {
          extraInfo.push(`env: ${option.envVar}`);
        }
        if (extraInfo.length > 0) {
          return `${option.description} (${extraInfo.join(", ")})`;
        }
        return option.description;
      }
      /**
       * Get the argument description to show in the list of arguments.
       *
       * @param {Argument} argument
       * @return {string}
       */
      argumentDescription(argument) {
        const extraInfo = [];
        if (argument.argChoices) {
          extraInfo.push(
            // use stringify to match the display of the default value
            `choices: ${argument.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`
          );
        }
        if (argument.defaultValue !== void 0) {
          extraInfo.push(
            `default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`
          );
        }
        if (extraInfo.length > 0) {
          const extraDescripton = `(${extraInfo.join(", ")})`;
          if (argument.description) {
            return `${argument.description} ${extraDescripton}`;
          }
          return extraDescripton;
        }
        return argument.description;
      }
      /**
       * Generate the built-in help text.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {string}
       */
      formatHelp(cmd, helper) {
        const termWidth = helper.padWidth(cmd, helper);
        const helpWidth = helper.helpWidth || 80;
        const itemIndentWidth = 2;
        const itemSeparatorWidth = 2;
        function formatItem(term, description) {
          if (description) {
            const fullText = `${term.padEnd(termWidth + itemSeparatorWidth)}${description}`;
            return helper.wrap(
              fullText,
              helpWidth - itemIndentWidth,
              termWidth + itemSeparatorWidth
            );
          }
          return term;
        }
        function formatList(textArray) {
          return textArray.join("\n").replace(/^/gm, " ".repeat(itemIndentWidth));
        }
        let output = [`Usage: ${helper.commandUsage(cmd)}`, ""];
        const commandDescription = helper.commandDescription(cmd);
        if (commandDescription.length > 0) {
          output = output.concat([
            helper.wrap(commandDescription, helpWidth, 0),
            ""
          ]);
        }
        const argumentList = helper.visibleArguments(cmd).map((argument) => {
          return formatItem(
            helper.argumentTerm(argument),
            helper.argumentDescription(argument)
          );
        });
        if (argumentList.length > 0) {
          output = output.concat(["Arguments:", formatList(argumentList), ""]);
        }
        const optionList = helper.visibleOptions(cmd).map((option) => {
          return formatItem(
            helper.optionTerm(option),
            helper.optionDescription(option)
          );
        });
        if (optionList.length > 0) {
          output = output.concat(["Options:", formatList(optionList), ""]);
        }
        if (this.showGlobalOptions) {
          const globalOptionList = helper.visibleGlobalOptions(cmd).map((option) => {
            return formatItem(
              helper.optionTerm(option),
              helper.optionDescription(option)
            );
          });
          if (globalOptionList.length > 0) {
            output = output.concat([
              "Global Options:",
              formatList(globalOptionList),
              ""
            ]);
          }
        }
        const commandList = helper.visibleCommands(cmd).map((cmd2) => {
          return formatItem(
            helper.subcommandTerm(cmd2),
            helper.subcommandDescription(cmd2)
          );
        });
        if (commandList.length > 0) {
          output = output.concat(["Commands:", formatList(commandList), ""]);
        }
        return output.join("\n");
      }
      /**
       * Calculate the pad width from the maximum term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      padWidth(cmd, helper) {
        return Math.max(
          helper.longestOptionTermLength(cmd, helper),
          helper.longestGlobalOptionTermLength(cmd, helper),
          helper.longestSubcommandTermLength(cmd, helper),
          helper.longestArgumentTermLength(cmd, helper)
        );
      }
      /**
       * Wrap the given string to width characters per line, with lines after the first indented.
       * Do not wrap if insufficient room for wrapping (minColumnWidth), or string is manually formatted.
       *
       * @param {string} str
       * @param {number} width
       * @param {number} indent
       * @param {number} [minColumnWidth=40]
       * @return {string}
       *
       */
      wrap(str2, width, indent, minColumnWidth = 40) {
        const indents = " \\f\\t\\v\xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF";
        const manualIndent = new RegExp(`[\\n][${indents}]+`);
        if (str2.match(manualIndent)) return str2;
        const columnWidth = width - indent;
        if (columnWidth < minColumnWidth) return str2;
        const leadingStr = str2.slice(0, indent);
        const columnText = str2.slice(indent).replace("\r\n", "\n");
        const indentString = " ".repeat(indent);
        const zeroWidthSpace = "\u200B";
        const breaks = `\\s${zeroWidthSpace}`;
        const regex = new RegExp(
          `
|.{1,${columnWidth - 1}}([${breaks}]|$)|[^${breaks}]+?([${breaks}]|$)`,
          "g"
        );
        const lines = columnText.match(regex) || [];
        return leadingStr + lines.map((line, i2) => {
          if (line === "\n") return "";
          return (i2 > 0 ? indentString : "") + line.trimEnd();
        }).join("\n");
      }
    };
    exports.Help = Help2;
  }
});

// node_modules/commander/lib/option.js
var require_option = __commonJS({
  "node_modules/commander/lib/option.js"(exports) {
    var { InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var Option2 = class {
      /**
       * Initialize a new `Option` with the given `flags` and `description`.
       *
       * @param {string} flags
       * @param {string} [description]
       */
      constructor(flags, description) {
        this.flags = flags;
        this.description = description || "";
        this.required = flags.includes("<");
        this.optional = flags.includes("[");
        this.variadic = /\w\.\.\.[>\]]$/.test(flags);
        this.mandatory = false;
        const optionFlags = splitOptionFlags(flags);
        this.short = optionFlags.shortFlag;
        this.long = optionFlags.longFlag;
        this.negate = false;
        if (this.long) {
          this.negate = this.long.startsWith("--no-");
        }
        this.defaultValue = void 0;
        this.defaultValueDescription = void 0;
        this.presetArg = void 0;
        this.envVar = void 0;
        this.parseArg = void 0;
        this.hidden = false;
        this.argChoices = void 0;
        this.conflictsWith = [];
        this.implied = void 0;
      }
      /**
       * Set the default value, and optionally supply the description to be displayed in the help.
       *
       * @param {*} value
       * @param {string} [description]
       * @return {Option}
       */
      default(value, description) {
        this.defaultValue = value;
        this.defaultValueDescription = description;
        return this;
      }
      /**
       * Preset to use when option used without option-argument, especially optional but also boolean and negated.
       * The custom processing (parseArg) is called.
       *
       * @example
       * new Option('--color').default('GREYSCALE').preset('RGB');
       * new Option('--donate [amount]').preset('20').argParser(parseFloat);
       *
       * @param {*} arg
       * @return {Option}
       */
      preset(arg) {
        this.presetArg = arg;
        return this;
      }
      /**
       * Add option name(s) that conflict with this option.
       * An error will be displayed if conflicting options are found during parsing.
       *
       * @example
       * new Option('--rgb').conflicts('cmyk');
       * new Option('--js').conflicts(['ts', 'jsx']);
       *
       * @param {(string | string[])} names
       * @return {Option}
       */
      conflicts(names) {
        this.conflictsWith = this.conflictsWith.concat(names);
        return this;
      }
      /**
       * Specify implied option values for when this option is set and the implied options are not.
       *
       * The custom processing (parseArg) is not called on the implied values.
       *
       * @example
       * program
       *   .addOption(new Option('--log', 'write logging information to file'))
       *   .addOption(new Option('--trace', 'log extra details').implies({ log: 'trace.txt' }));
       *
       * @param {object} impliedOptionValues
       * @return {Option}
       */
      implies(impliedOptionValues) {
        let newImplied = impliedOptionValues;
        if (typeof impliedOptionValues === "string") {
          newImplied = { [impliedOptionValues]: true };
        }
        this.implied = Object.assign(this.implied || {}, newImplied);
        return this;
      }
      /**
       * Set environment variable to check for option value.
       *
       * An environment variable is only used if when processed the current option value is
       * undefined, or the source of the current value is 'default' or 'config' or 'env'.
       *
       * @param {string} name
       * @return {Option}
       */
      env(name) {
        this.envVar = name;
        return this;
      }
      /**
       * Set the custom handler for processing CLI option arguments into option values.
       *
       * @param {Function} [fn]
       * @return {Option}
       */
      argParser(fn) {
        this.parseArg = fn;
        return this;
      }
      /**
       * Whether the option is mandatory and must have a value after parsing.
       *
       * @param {boolean} [mandatory=true]
       * @return {Option}
       */
      makeOptionMandatory(mandatory = true) {
        this.mandatory = !!mandatory;
        return this;
      }
      /**
       * Hide option in help.
       *
       * @param {boolean} [hide=true]
       * @return {Option}
       */
      hideHelp(hide = true) {
        this.hidden = !!hide;
        return this;
      }
      /**
       * @package
       */
      _concatValue(value, previous) {
        if (previous === this.defaultValue || !Array.isArray(previous)) {
          return [value];
        }
        return previous.concat(value);
      }
      /**
       * Only allow option value to be one of choices.
       *
       * @param {string[]} values
       * @return {Option}
       */
      choices(values) {
        this.argChoices = values.slice();
        this.parseArg = (arg, previous) => {
          if (!this.argChoices.includes(arg)) {
            throw new InvalidArgumentError2(
              `Allowed choices are ${this.argChoices.join(", ")}.`
            );
          }
          if (this.variadic) {
            return this._concatValue(arg, previous);
          }
          return arg;
        };
        return this;
      }
      /**
       * Return option name.
       *
       * @return {string}
       */
      name() {
        if (this.long) {
          return this.long.replace(/^--/, "");
        }
        return this.short.replace(/^-/, "");
      }
      /**
       * Return option name, in a camelcase format that can be used
       * as a object attribute key.
       *
       * @return {string}
       */
      attributeName() {
        return camelcase(this.name().replace(/^no-/, ""));
      }
      /**
       * Check if `arg` matches the short or long flag.
       *
       * @param {string} arg
       * @return {boolean}
       * @package
       */
      is(arg) {
        return this.short === arg || this.long === arg;
      }
      /**
       * Return whether a boolean option.
       *
       * Options are one of boolean, negated, required argument, or optional argument.
       *
       * @return {boolean}
       * @package
       */
      isBoolean() {
        return !this.required && !this.optional && !this.negate;
      }
    };
    var DualOptions = class {
      /**
       * @param {Option[]} options
       */
      constructor(options) {
        this.positiveOptions = /* @__PURE__ */ new Map();
        this.negativeOptions = /* @__PURE__ */ new Map();
        this.dualOptions = /* @__PURE__ */ new Set();
        options.forEach((option) => {
          if (option.negate) {
            this.negativeOptions.set(option.attributeName(), option);
          } else {
            this.positiveOptions.set(option.attributeName(), option);
          }
        });
        this.negativeOptions.forEach((value, key) => {
          if (this.positiveOptions.has(key)) {
            this.dualOptions.add(key);
          }
        });
      }
      /**
       * Did the value come from the option, and not from possible matching dual option?
       *
       * @param {*} value
       * @param {Option} option
       * @returns {boolean}
       */
      valueFromOption(value, option) {
        const optionKey = option.attributeName();
        if (!this.dualOptions.has(optionKey)) return true;
        const preset = this.negativeOptions.get(optionKey).presetArg;
        const negativeValue = preset !== void 0 ? preset : false;
        return option.negate === (negativeValue === value);
      }
    };
    function camelcase(str2) {
      return str2.split("-").reduce((str3, word) => {
        return str3 + word[0].toUpperCase() + word.slice(1);
      });
    }
    function splitOptionFlags(flags) {
      let shortFlag;
      let longFlag;
      const flagParts = flags.split(/[ |,]+/);
      if (flagParts.length > 1 && !/^[[<]/.test(flagParts[1]))
        shortFlag = flagParts.shift();
      longFlag = flagParts.shift();
      if (!shortFlag && /^-[^-]$/.test(longFlag)) {
        shortFlag = longFlag;
        longFlag = void 0;
      }
      return { shortFlag, longFlag };
    }
    exports.Option = Option2;
    exports.DualOptions = DualOptions;
  }
});

// node_modules/commander/lib/suggestSimilar.js
var require_suggestSimilar = __commonJS({
  "node_modules/commander/lib/suggestSimilar.js"(exports) {
    var maxDistance = 3;
    function editDistance(a, b2) {
      if (Math.abs(a.length - b2.length) > maxDistance)
        return Math.max(a.length, b2.length);
      const d = [];
      for (let i2 = 0; i2 <= a.length; i2++) {
        d[i2] = [i2];
      }
      for (let j2 = 0; j2 <= b2.length; j2++) {
        d[0][j2] = j2;
      }
      for (let j2 = 1; j2 <= b2.length; j2++) {
        for (let i2 = 1; i2 <= a.length; i2++) {
          let cost = 1;
          if (a[i2 - 1] === b2[j2 - 1]) {
            cost = 0;
          } else {
            cost = 1;
          }
          d[i2][j2] = Math.min(
            d[i2 - 1][j2] + 1,
            // deletion
            d[i2][j2 - 1] + 1,
            // insertion
            d[i2 - 1][j2 - 1] + cost
            // substitution
          );
          if (i2 > 1 && j2 > 1 && a[i2 - 1] === b2[j2 - 2] && a[i2 - 2] === b2[j2 - 1]) {
            d[i2][j2] = Math.min(d[i2][j2], d[i2 - 2][j2 - 2] + 1);
          }
        }
      }
      return d[a.length][b2.length];
    }
    function suggestSimilar(word, candidates) {
      if (!candidates || candidates.length === 0) return "";
      candidates = Array.from(new Set(candidates));
      const searchingOptions = word.startsWith("--");
      if (searchingOptions) {
        word = word.slice(2);
        candidates = candidates.map((candidate) => candidate.slice(2));
      }
      let similar = [];
      let bestDistance = maxDistance;
      const minSimilarity = 0.4;
      candidates.forEach((candidate) => {
        if (candidate.length <= 1) return;
        const distance = editDistance(word, candidate);
        const length = Math.max(word.length, candidate.length);
        const similarity = (length - distance) / length;
        if (similarity > minSimilarity) {
          if (distance < bestDistance) {
            bestDistance = distance;
            similar = [candidate];
          } else if (distance === bestDistance) {
            similar.push(candidate);
          }
        }
      });
      similar.sort((a, b2) => a.localeCompare(b2));
      if (searchingOptions) {
        similar = similar.map((candidate) => `--${candidate}`);
      }
      if (similar.length > 1) {
        return `
(Did you mean one of ${similar.join(", ")}?)`;
      }
      if (similar.length === 1) {
        return `
(Did you mean ${similar[0]}?)`;
      }
      return "";
    }
    exports.suggestSimilar = suggestSimilar;
  }
});

// node_modules/commander/lib/command.js
var require_command = __commonJS({
  "node_modules/commander/lib/command.js"(exports) {
    var EventEmitter2 = __require("node:events").EventEmitter;
    var childProcess = __require("node:child_process");
    var path = __require("node:path");
    var fs = __require("node:fs");
    var process3 = __require("node:process");
    var { Argument: Argument2, humanReadableArgName } = require_argument();
    var { CommanderError: CommanderError2 } = require_error();
    var { Help: Help2 } = require_help();
    var { Option: Option2, DualOptions } = require_option();
    var { suggestSimilar } = require_suggestSimilar();
    var Command2 = class _Command extends EventEmitter2 {
      /**
       * Initialize a new `Command`.
       *
       * @param {string} [name]
       */
      constructor(name) {
        super();
        this.commands = [];
        this.options = [];
        this.parent = null;
        this._allowUnknownOption = false;
        this._allowExcessArguments = true;
        this.registeredArguments = [];
        this._args = this.registeredArguments;
        this.args = [];
        this.rawArgs = [];
        this.processedArgs = [];
        this._scriptPath = null;
        this._name = name || "";
        this._optionValues = {};
        this._optionValueSources = {};
        this._storeOptionsAsProperties = false;
        this._actionHandler = null;
        this._executableHandler = false;
        this._executableFile = null;
        this._executableDir = null;
        this._defaultCommandName = null;
        this._exitCallback = null;
        this._aliases = [];
        this._combineFlagAndOptionalValue = true;
        this._description = "";
        this._summary = "";
        this._argsDescription = void 0;
        this._enablePositionalOptions = false;
        this._passThroughOptions = false;
        this._lifeCycleHooks = {};
        this._showHelpAfterError = false;
        this._showSuggestionAfterError = true;
        this._outputConfiguration = {
          writeOut: (str2) => process3.stdout.write(str2),
          writeErr: (str2) => process3.stderr.write(str2),
          getOutHelpWidth: () => process3.stdout.isTTY ? process3.stdout.columns : void 0,
          getErrHelpWidth: () => process3.stderr.isTTY ? process3.stderr.columns : void 0,
          outputError: (str2, write) => write(str2)
        };
        this._hidden = false;
        this._helpOption = void 0;
        this._addImplicitHelpCommand = void 0;
        this._helpCommand = void 0;
        this._helpConfiguration = {};
      }
      /**
       * Copy settings that are useful to have in common across root command and subcommands.
       *
       * (Used internally when adding a command using `.command()` so subcommands inherit parent settings.)
       *
       * @param {Command} sourceCommand
       * @return {Command} `this` command for chaining
       */
      copyInheritedSettings(sourceCommand) {
        this._outputConfiguration = sourceCommand._outputConfiguration;
        this._helpOption = sourceCommand._helpOption;
        this._helpCommand = sourceCommand._helpCommand;
        this._helpConfiguration = sourceCommand._helpConfiguration;
        this._exitCallback = sourceCommand._exitCallback;
        this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties;
        this._combineFlagAndOptionalValue = sourceCommand._combineFlagAndOptionalValue;
        this._allowExcessArguments = sourceCommand._allowExcessArguments;
        this._enablePositionalOptions = sourceCommand._enablePositionalOptions;
        this._showHelpAfterError = sourceCommand._showHelpAfterError;
        this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError;
        return this;
      }
      /**
       * @returns {Command[]}
       * @private
       */
      _getCommandAndAncestors() {
        const result = [];
        for (let command = this; command; command = command.parent) {
          result.push(command);
        }
        return result;
      }
      /**
       * Define a command.
       *
       * There are two styles of command: pay attention to where to put the description.
       *
       * @example
       * // Command implemented using action handler (description is supplied separately to `.command`)
       * program
       *   .command('clone <source> [destination]')
       *   .description('clone a repository into a newly created directory')
       *   .action((source, destination) => {
       *     console.log('clone command called');
       *   });
       *
       * // Command implemented using separate executable file (description is second parameter to `.command`)
       * program
       *   .command('start <service>', 'start named service')
       *   .command('stop [service]', 'stop named service, or all if no name supplied');
       *
       * @param {string} nameAndArgs - command name and arguments, args are `<required>` or `[optional]` and last may also be `variadic...`
       * @param {(object | string)} [actionOptsOrExecDesc] - configuration options (for action), or description (for executable)
       * @param {object} [execOpts] - configuration options (for executable)
       * @return {Command} returns new command for action handler, or `this` for executable command
       */
      command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
        let desc = actionOptsOrExecDesc;
        let opts = execOpts;
        if (typeof desc === "object" && desc !== null) {
          opts = desc;
          desc = null;
        }
        opts = opts || {};
        const [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);
        const cmd = this.createCommand(name);
        if (desc) {
          cmd.description(desc);
          cmd._executableHandler = true;
        }
        if (opts.isDefault) this._defaultCommandName = cmd._name;
        cmd._hidden = !!(opts.noHelp || opts.hidden);
        cmd._executableFile = opts.executableFile || null;
        if (args) cmd.arguments(args);
        this._registerCommand(cmd);
        cmd.parent = this;
        cmd.copyInheritedSettings(this);
        if (desc) return this;
        return cmd;
      }
      /**
       * Factory routine to create a new unattached command.
       *
       * See .command() for creating an attached subcommand, which uses this routine to
       * create the command. You can override createCommand to customise subcommands.
       *
       * @param {string} [name]
       * @return {Command} new command
       */
      createCommand(name) {
        return new _Command(name);
      }
      /**
       * You can customise the help with a subclass of Help by overriding createHelp,
       * or by overriding Help properties using configureHelp().
       *
       * @return {Help}
       */
      createHelp() {
        return Object.assign(new Help2(), this.configureHelp());
      }
      /**
       * You can customise the help by overriding Help properties using configureHelp(),
       * or with a subclass of Help by overriding createHelp().
       *
       * @param {object} [configuration] - configuration options
       * @return {(Command | object)} `this` command for chaining, or stored configuration
       */
      configureHelp(configuration) {
        if (configuration === void 0) return this._helpConfiguration;
        this._helpConfiguration = configuration;
        return this;
      }
      /**
       * The default output goes to stdout and stderr. You can customise this for special
       * applications. You can also customise the display of errors by overriding outputError.
       *
       * The configuration properties are all functions:
       *
       *     // functions to change where being written, stdout and stderr
       *     writeOut(str)
       *     writeErr(str)
       *     // matching functions to specify width for wrapping help
       *     getOutHelpWidth()
       *     getErrHelpWidth()
       *     // functions based on what is being written out
       *     outputError(str, write) // used for displaying errors, and not used for displaying help
       *
       * @param {object} [configuration] - configuration options
       * @return {(Command | object)} `this` command for chaining, or stored configuration
       */
      configureOutput(configuration) {
        if (configuration === void 0) return this._outputConfiguration;
        Object.assign(this._outputConfiguration, configuration);
        return this;
      }
      /**
       * Display the help or a custom message after an error occurs.
       *
       * @param {(boolean|string)} [displayHelp]
       * @return {Command} `this` command for chaining
       */
      showHelpAfterError(displayHelp = true) {
        if (typeof displayHelp !== "string") displayHelp = !!displayHelp;
        this._showHelpAfterError = displayHelp;
        return this;
      }
      /**
       * Display suggestion of similar commands for unknown commands, or options for unknown options.
       *
       * @param {boolean} [displaySuggestion]
       * @return {Command} `this` command for chaining
       */
      showSuggestionAfterError(displaySuggestion = true) {
        this._showSuggestionAfterError = !!displaySuggestion;
        return this;
      }
      /**
       * Add a prepared subcommand.
       *
       * See .command() for creating an attached subcommand which inherits settings from its parent.
       *
       * @param {Command} cmd - new subcommand
       * @param {object} [opts] - configuration options
       * @return {Command} `this` command for chaining
       */
      addCommand(cmd, opts) {
        if (!cmd._name) {
          throw new Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
        }
        opts = opts || {};
        if (opts.isDefault) this._defaultCommandName = cmd._name;
        if (opts.noHelp || opts.hidden) cmd._hidden = true;
        this._registerCommand(cmd);
        cmd.parent = this;
        cmd._checkForBrokenPassThrough();
        return this;
      }
      /**
       * Factory routine to create a new unattached argument.
       *
       * See .argument() for creating an attached argument, which uses this routine to
       * create the argument. You can override createArgument to return a custom argument.
       *
       * @param {string} name
       * @param {string} [description]
       * @return {Argument} new argument
       */
      createArgument(name, description) {
        return new Argument2(name, description);
      }
      /**
       * Define argument syntax for command.
       *
       * The default is that the argument is required, and you can explicitly
       * indicate this with <> around the name. Put [] around the name for an optional argument.
       *
       * @example
       * program.argument('<input-file>');
       * program.argument('[output-file]');
       *
       * @param {string} name
       * @param {string} [description]
       * @param {(Function|*)} [fn] - custom argument processing function
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      argument(name, description, fn, defaultValue) {
        const argument = this.createArgument(name, description);
        if (typeof fn === "function") {
          argument.default(defaultValue).argParser(fn);
        } else {
          argument.default(fn);
        }
        this.addArgument(argument);
        return this;
      }
      /**
       * Define argument syntax for command, adding multiple at once (without descriptions).
       *
       * See also .argument().
       *
       * @example
       * program.arguments('<cmd> [env]');
       *
       * @param {string} names
       * @return {Command} `this` command for chaining
       */
      arguments(names) {
        names.trim().split(/ +/).forEach((detail) => {
          this.argument(detail);
        });
        return this;
      }
      /**
       * Define argument syntax for command, adding a prepared argument.
       *
       * @param {Argument} argument
       * @return {Command} `this` command for chaining
       */
      addArgument(argument) {
        const previousArgument = this.registeredArguments.slice(-1)[0];
        if (previousArgument && previousArgument.variadic) {
          throw new Error(
            `only the last argument can be variadic '${previousArgument.name()}'`
          );
        }
        if (argument.required && argument.defaultValue !== void 0 && argument.parseArg === void 0) {
          throw new Error(
            `a default value for a required argument is never used: '${argument.name()}'`
          );
        }
        this.registeredArguments.push(argument);
        return this;
      }
      /**
       * Customise or override default help command. By default a help command is automatically added if your command has subcommands.
       *
       * @example
       *    program.helpCommand('help [cmd]');
       *    program.helpCommand('help [cmd]', 'show help');
       *    program.helpCommand(false); // suppress default help command
       *    program.helpCommand(true); // add help command even if no subcommands
       *
       * @param {string|boolean} enableOrNameAndArgs - enable with custom name and/or arguments, or boolean to override whether added
       * @param {string} [description] - custom description
       * @return {Command} `this` command for chaining
       */
      helpCommand(enableOrNameAndArgs, description) {
        if (typeof enableOrNameAndArgs === "boolean") {
          this._addImplicitHelpCommand = enableOrNameAndArgs;
          return this;
        }
        enableOrNameAndArgs = enableOrNameAndArgs ?? "help [command]";
        const [, helpName, helpArgs] = enableOrNameAndArgs.match(/([^ ]+) *(.*)/);
        const helpDescription = description ?? "display help for command";
        const helpCommand = this.createCommand(helpName);
        helpCommand.helpOption(false);
        if (helpArgs) helpCommand.arguments(helpArgs);
        if (helpDescription) helpCommand.description(helpDescription);
        this._addImplicitHelpCommand = true;
        this._helpCommand = helpCommand;
        return this;
      }
      /**
       * Add prepared custom help command.
       *
       * @param {(Command|string|boolean)} helpCommand - custom help command, or deprecated enableOrNameAndArgs as for `.helpCommand()`
       * @param {string} [deprecatedDescription] - deprecated custom description used with custom name only
       * @return {Command} `this` command for chaining
       */
      addHelpCommand(helpCommand, deprecatedDescription) {
        if (typeof helpCommand !== "object") {
          this.helpCommand(helpCommand, deprecatedDescription);
          return this;
        }
        this._addImplicitHelpCommand = true;
        this._helpCommand = helpCommand;
        return this;
      }
      /**
       * Lazy create help command.
       *
       * @return {(Command|null)}
       * @package
       */
      _getHelpCommand() {
        const hasImplicitHelpCommand = this._addImplicitHelpCommand ?? (this.commands.length && !this._actionHandler && !this._findCommand("help"));
        if (hasImplicitHelpCommand) {
          if (this._helpCommand === void 0) {
            this.helpCommand(void 0, void 0);
          }
          return this._helpCommand;
        }
        return null;
      }
      /**
       * Add hook for life cycle event.
       *
       * @param {string} event
       * @param {Function} listener
       * @return {Command} `this` command for chaining
       */
      hook(event, listener) {
        const allowedValues = ["preSubcommand", "preAction", "postAction"];
        if (!allowedValues.includes(event)) {
          throw new Error(`Unexpected value for event passed to hook : '${event}'.
Expecting one of '${allowedValues.join("', '")}'`);
        }
        if (this._lifeCycleHooks[event]) {
          this._lifeCycleHooks[event].push(listener);
        } else {
          this._lifeCycleHooks[event] = [listener];
        }
        return this;
      }
      /**
       * Register callback to use as replacement for calling process.exit.
       *
       * @param {Function} [fn] optional callback which will be passed a CommanderError, defaults to throwing
       * @return {Command} `this` command for chaining
       */
      exitOverride(fn) {
        if (fn) {
          this._exitCallback = fn;
        } else {
          this._exitCallback = (err) => {
            if (err.code !== "commander.executeSubCommandAsync") {
              throw err;
            } else {
            }
          };
        }
        return this;
      }
      /**
       * Call process.exit, and _exitCallback if defined.
       *
       * @param {number} exitCode exit code for using with process.exit
       * @param {string} code an id string representing the error
       * @param {string} message human-readable description of the error
       * @return never
       * @private
       */
      _exit(exitCode, code, message) {
        if (this._exitCallback) {
          this._exitCallback(new CommanderError2(exitCode, code, message));
        }
        process3.exit(exitCode);
      }
      /**
       * Register callback `fn` for the command.
       *
       * @example
       * program
       *   .command('serve')
       *   .description('start service')
       *   .action(function() {
       *      // do work here
       *   });
       *
       * @param {Function} fn
       * @return {Command} `this` command for chaining
       */
      action(fn) {
        const listener = (args) => {
          const expectedArgsCount = this.registeredArguments.length;
          const actionArgs = args.slice(0, expectedArgsCount);
          if (this._storeOptionsAsProperties) {
            actionArgs[expectedArgsCount] = this;
          } else {
            actionArgs[expectedArgsCount] = this.opts();
          }
          actionArgs.push(this);
          return fn.apply(this, actionArgs);
        };
        this._actionHandler = listener;
        return this;
      }
      /**
       * Factory routine to create a new unattached option.
       *
       * See .option() for creating an attached option, which uses this routine to
       * create the option. You can override createOption to return a custom option.
       *
       * @param {string} flags
       * @param {string} [description]
       * @return {Option} new option
       */
      createOption(flags, description) {
        return new Option2(flags, description);
      }
      /**
       * Wrap parseArgs to catch 'commander.invalidArgument'.
       *
       * @param {(Option | Argument)} target
       * @param {string} value
       * @param {*} previous
       * @param {string} invalidArgumentMessage
       * @private
       */
      _callParseArg(target, value, previous, invalidArgumentMessage) {
        try {
          return target.parseArg(value, previous);
        } catch (err) {
          if (err.code === "commander.invalidArgument") {
            const message = `${invalidArgumentMessage} ${err.message}`;
            this.error(message, { exitCode: err.exitCode, code: err.code });
          }
          throw err;
        }
      }
      /**
       * Check for option flag conflicts.
       * Register option if no conflicts found, or throw on conflict.
       *
       * @param {Option} option
       * @private
       */
      _registerOption(option) {
        const matchingOption = option.short && this._findOption(option.short) || option.long && this._findOption(option.long);
        if (matchingOption) {
          const matchingFlag = option.long && this._findOption(option.long) ? option.long : option.short;
          throw new Error(`Cannot add option '${option.flags}'${this._name && ` to command '${this._name}'`} due to conflicting flag '${matchingFlag}'
-  already used by option '${matchingOption.flags}'`);
        }
        this.options.push(option);
      }
      /**
       * Check for command name and alias conflicts with existing commands.
       * Register command if no conflicts found, or throw on conflict.
       *
       * @param {Command} command
       * @private
       */
      _registerCommand(command) {
        const knownBy = (cmd) => {
          return [cmd.name()].concat(cmd.aliases());
        };
        const alreadyUsed = knownBy(command).find(
          (name) => this._findCommand(name)
        );
        if (alreadyUsed) {
          const existingCmd = knownBy(this._findCommand(alreadyUsed)).join("|");
          const newCmd = knownBy(command).join("|");
          throw new Error(
            `cannot add command '${newCmd}' as already have command '${existingCmd}'`
          );
        }
        this.commands.push(command);
      }
      /**
       * Add an option.
       *
       * @param {Option} option
       * @return {Command} `this` command for chaining
       */
      addOption(option) {
        this._registerOption(option);
        const oname = option.name();
        const name = option.attributeName();
        if (option.negate) {
          const positiveLongFlag = option.long.replace(/^--no-/, "--");
          if (!this._findOption(positiveLongFlag)) {
            this.setOptionValueWithSource(
              name,
              option.defaultValue === void 0 ? true : option.defaultValue,
              "default"
            );
          }
        } else if (option.defaultValue !== void 0) {
          this.setOptionValueWithSource(name, option.defaultValue, "default");
        }
        const handleOptionValue = (val, invalidValueMessage, valueSource) => {
          if (val == null && option.presetArg !== void 0) {
            val = option.presetArg;
          }
          const oldValue = this.getOptionValue(name);
          if (val !== null && option.parseArg) {
            val = this._callParseArg(option, val, oldValue, invalidValueMessage);
          } else if (val !== null && option.variadic) {
            val = option._concatValue(val, oldValue);
          }
          if (val == null) {
            if (option.negate) {
              val = false;
            } else if (option.isBoolean() || option.optional) {
              val = true;
            } else {
              val = "";
            }
          }
          this.setOptionValueWithSource(name, val, valueSource);
        };
        this.on("option:" + oname, (val) => {
          const invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
          handleOptionValue(val, invalidValueMessage, "cli");
        });
        if (option.envVar) {
          this.on("optionEnv:" + oname, (val) => {
            const invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
            handleOptionValue(val, invalidValueMessage, "env");
          });
        }
        return this;
      }
      /**
       * Internal implementation shared by .option() and .requiredOption()
       *
       * @return {Command} `this` command for chaining
       * @private
       */
      _optionEx(config, flags, description, fn, defaultValue) {
        if (typeof flags === "object" && flags instanceof Option2) {
          throw new Error(
            "To add an Option object use addOption() instead of option() or requiredOption()"
          );
        }
        const option = this.createOption(flags, description);
        option.makeOptionMandatory(!!config.mandatory);
        if (typeof fn === "function") {
          option.default(defaultValue).argParser(fn);
        } else if (fn instanceof RegExp) {
          const regex = fn;
          fn = (val, def) => {
            const m = regex.exec(val);
            return m ? m[0] : def;
          };
          option.default(defaultValue).argParser(fn);
        } else {
          option.default(fn);
        }
        return this.addOption(option);
      }
      /**
       * Define option with `flags`, `description`, and optional argument parsing function or `defaultValue` or both.
       *
       * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space. A required
       * option-argument is indicated by `<>` and an optional option-argument by `[]`.
       *
       * See the README for more details, and see also addOption() and requiredOption().
       *
       * @example
       * program
       *     .option('-p, --pepper', 'add pepper')
       *     .option('-p, --pizza-type <TYPE>', 'type of pizza') // required option-argument
       *     .option('-c, --cheese [CHEESE]', 'add extra cheese', 'mozzarella') // optional option-argument with default
       *     .option('-t, --tip <VALUE>', 'add tip to purchase cost', parseFloat) // custom parse function
       *
       * @param {string} flags
       * @param {string} [description]
       * @param {(Function|*)} [parseArg] - custom option processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      option(flags, description, parseArg, defaultValue) {
        return this._optionEx({}, flags, description, parseArg, defaultValue);
      }
      /**
       * Add a required option which must have a value after parsing. This usually means
       * the option must be specified on the command line. (Otherwise the same as .option().)
       *
       * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space.
       *
       * @param {string} flags
       * @param {string} [description]
       * @param {(Function|*)} [parseArg] - custom option processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      requiredOption(flags, description, parseArg, defaultValue) {
        return this._optionEx(
          { mandatory: true },
          flags,
          description,
          parseArg,
          defaultValue
        );
      }
      /**
       * Alter parsing of short flags with optional values.
       *
       * @example
       * // for `.option('-f,--flag [value]'):
       * program.combineFlagAndOptionalValue(true);  // `-f80` is treated like `--flag=80`, this is the default behaviour
       * program.combineFlagAndOptionalValue(false) // `-fb` is treated like `-f -b`
       *
       * @param {boolean} [combine] - if `true` or omitted, an optional value can be specified directly after the flag.
       * @return {Command} `this` command for chaining
       */
      combineFlagAndOptionalValue(combine = true) {
        this._combineFlagAndOptionalValue = !!combine;
        return this;
      }
      /**
       * Allow unknown options on the command line.
       *
       * @param {boolean} [allowUnknown] - if `true` or omitted, no error will be thrown for unknown options.
       * @return {Command} `this` command for chaining
       */
      allowUnknownOption(allowUnknown = true) {
        this._allowUnknownOption = !!allowUnknown;
        return this;
      }
      /**
       * Allow excess command-arguments on the command line. Pass false to make excess arguments an error.
       *
       * @param {boolean} [allowExcess] - if `true` or omitted, no error will be thrown for excess arguments.
       * @return {Command} `this` command for chaining
       */
      allowExcessArguments(allowExcess = true) {
        this._allowExcessArguments = !!allowExcess;
        return this;
      }
      /**
       * Enable positional options. Positional means global options are specified before subcommands which lets
       * subcommands reuse the same option names, and also enables subcommands to turn on passThroughOptions.
       * The default behaviour is non-positional and global options may appear anywhere on the command line.
       *
       * @param {boolean} [positional]
       * @return {Command} `this` command for chaining
       */
      enablePositionalOptions(positional = true) {
        this._enablePositionalOptions = !!positional;
        return this;
      }
      /**
       * Pass through options that come after command-arguments rather than treat them as command-options,
       * so actual command-options come before command-arguments. Turning this on for a subcommand requires
       * positional options to have been enabled on the program (parent commands).
       * The default behaviour is non-positional and options may appear before or after command-arguments.
       *
       * @param {boolean} [passThrough] for unknown options.
       * @return {Command} `this` command for chaining
       */
      passThroughOptions(passThrough = true) {
        this._passThroughOptions = !!passThrough;
        this._checkForBrokenPassThrough();
        return this;
      }
      /**
       * @private
       */
      _checkForBrokenPassThrough() {
        if (this.parent && this._passThroughOptions && !this.parent._enablePositionalOptions) {
          throw new Error(
            `passThroughOptions cannot be used for '${this._name}' without turning on enablePositionalOptions for parent command(s)`
          );
        }
      }
      /**
       * Whether to store option values as properties on command object,
       * or store separately (specify false). In both cases the option values can be accessed using .opts().
       *
       * @param {boolean} [storeAsProperties=true]
       * @return {Command} `this` command for chaining
       */
      storeOptionsAsProperties(storeAsProperties = true) {
        if (this.options.length) {
          throw new Error("call .storeOptionsAsProperties() before adding options");
        }
        if (Object.keys(this._optionValues).length) {
          throw new Error(
            "call .storeOptionsAsProperties() before setting option values"
          );
        }
        this._storeOptionsAsProperties = !!storeAsProperties;
        return this;
      }
      /**
       * Retrieve option value.
       *
       * @param {string} key
       * @return {object} value
       */
      getOptionValue(key) {
        if (this._storeOptionsAsProperties) {
          return this[key];
        }
        return this._optionValues[key];
      }
      /**
       * Store option value.
       *
       * @param {string} key
       * @param {object} value
       * @return {Command} `this` command for chaining
       */
      setOptionValue(key, value) {
        return this.setOptionValueWithSource(key, value, void 0);
      }
      /**
       * Store option value and where the value came from.
       *
       * @param {string} key
       * @param {object} value
       * @param {string} source - expected values are default/config/env/cli/implied
       * @return {Command} `this` command for chaining
       */
      setOptionValueWithSource(key, value, source) {
        if (this._storeOptionsAsProperties) {
          this[key] = value;
        } else {
          this._optionValues[key] = value;
        }
        this._optionValueSources[key] = source;
        return this;
      }
      /**
       * Get source of option value.
       * Expected values are default | config | env | cli | implied
       *
       * @param {string} key
       * @return {string}
       */
      getOptionValueSource(key) {
        return this._optionValueSources[key];
      }
      /**
       * Get source of option value. See also .optsWithGlobals().
       * Expected values are default | config | env | cli | implied
       *
       * @param {string} key
       * @return {string}
       */
      getOptionValueSourceWithGlobals(key) {
        let source;
        this._getCommandAndAncestors().forEach((cmd) => {
          if (cmd.getOptionValueSource(key) !== void 0) {
            source = cmd.getOptionValueSource(key);
          }
        });
        return source;
      }
      /**
       * Get user arguments from implied or explicit arguments.
       * Side-effects: set _scriptPath if args included script. Used for default program name, and subcommand searches.
       *
       * @private
       */
      _prepareUserArgs(argv, parseOptions) {
        if (argv !== void 0 && !Array.isArray(argv)) {
          throw new Error("first parameter to parse must be array or undefined");
        }
        parseOptions = parseOptions || {};
        if (argv === void 0 && parseOptions.from === void 0) {
          if (process3.versions?.electron) {
            parseOptions.from = "electron";
          }
          const execArgv = process3.execArgv ?? [];
          if (execArgv.includes("-e") || execArgv.includes("--eval") || execArgv.includes("-p") || execArgv.includes("--print")) {
            parseOptions.from = "eval";
          }
        }
        if (argv === void 0) {
          argv = process3.argv;
        }
        this.rawArgs = argv.slice();
        let userArgs;
        switch (parseOptions.from) {
          case void 0:
          case "node":
            this._scriptPath = argv[1];
            userArgs = argv.slice(2);
            break;
          case "electron":
            if (process3.defaultApp) {
              this._scriptPath = argv[1];
              userArgs = argv.slice(2);
            } else {
              userArgs = argv.slice(1);
            }
            break;
          case "user":
            userArgs = argv.slice(0);
            break;
          case "eval":
            userArgs = argv.slice(1);
            break;
          default:
            throw new Error(
              `unexpected parse option { from: '${parseOptions.from}' }`
            );
        }
        if (!this._name && this._scriptPath)
          this.nameFromFilename(this._scriptPath);
        this._name = this._name || "program";
        return userArgs;
      }
      /**
       * Parse `argv`, setting options and invoking commands when defined.
       *
       * Use parseAsync instead of parse if any of your action handlers are async.
       *
       * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
       *
       * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
       * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
       * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
       * - `'user'`: just user arguments
       *
       * @example
       * program.parse(); // parse process.argv and auto-detect electron and special node flags
       * program.parse(process.argv); // assume argv[0] is app and argv[1] is script
       * program.parse(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
       *
       * @param {string[]} [argv] - optional, defaults to process.argv
       * @param {object} [parseOptions] - optionally specify style of options with from: node/user/electron
       * @param {string} [parseOptions.from] - where the args are from: 'node', 'user', 'electron'
       * @return {Command} `this` command for chaining
       */
      parse(argv, parseOptions) {
        const userArgs = this._prepareUserArgs(argv, parseOptions);
        this._parseCommand([], userArgs);
        return this;
      }
      /**
       * Parse `argv`, setting options and invoking commands when defined.
       *
       * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
       *
       * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
       * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
       * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
       * - `'user'`: just user arguments
       *
       * @example
       * await program.parseAsync(); // parse process.argv and auto-detect electron and special node flags
       * await program.parseAsync(process.argv); // assume argv[0] is app and argv[1] is script
       * await program.parseAsync(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
       *
       * @param {string[]} [argv]
       * @param {object} [parseOptions]
       * @param {string} parseOptions.from - where the args are from: 'node', 'user', 'electron'
       * @return {Promise}
       */
      async parseAsync(argv, parseOptions) {
        const userArgs = this._prepareUserArgs(argv, parseOptions);
        await this._parseCommand([], userArgs);
        return this;
      }
      /**
       * Execute a sub-command executable.
       *
       * @private
       */
      _executeSubCommand(subcommand, args) {
        args = args.slice();
        let launchWithNode = false;
        const sourceExt = [".js", ".ts", ".tsx", ".mjs", ".cjs"];
        function findFile(baseDir, baseName2) {
          const localBin = path.resolve(baseDir, baseName2);
          if (fs.existsSync(localBin)) return localBin;
          if (sourceExt.includes(path.extname(baseName2))) return void 0;
          const foundExt = sourceExt.find(
            (ext) => fs.existsSync(`${localBin}${ext}`)
          );
          if (foundExt) return `${localBin}${foundExt}`;
          return void 0;
        }
        this._checkForMissingMandatoryOptions();
        this._checkForConflictingOptions();
        let executableFile = subcommand._executableFile || `${this._name}-${subcommand._name}`;
        let executableDir = this._executableDir || "";
        if (this._scriptPath) {
          let resolvedScriptPath;
          try {
            resolvedScriptPath = fs.realpathSync(this._scriptPath);
          } catch (err) {
            resolvedScriptPath = this._scriptPath;
          }
          executableDir = path.resolve(
            path.dirname(resolvedScriptPath),
            executableDir
          );
        }
        if (executableDir) {
          let localFile = findFile(executableDir, executableFile);
          if (!localFile && !subcommand._executableFile && this._scriptPath) {
            const legacyName = path.basename(
              this._scriptPath,
              path.extname(this._scriptPath)
            );
            if (legacyName !== this._name) {
              localFile = findFile(
                executableDir,
                `${legacyName}-${subcommand._name}`
              );
            }
          }
          executableFile = localFile || executableFile;
        }
        launchWithNode = sourceExt.includes(path.extname(executableFile));
        let proc;
        if (process3.platform !== "win32") {
          if (launchWithNode) {
            args.unshift(executableFile);
            args = incrementNodeInspectorPort(process3.execArgv).concat(args);
            proc = childProcess.spawn(process3.argv[0], args, { stdio: "inherit" });
          } else {
            proc = childProcess.spawn(executableFile, args, { stdio: "inherit" });
          }
        } else {
          args.unshift(executableFile);
          args = incrementNodeInspectorPort(process3.execArgv).concat(args);
          proc = childProcess.spawn(process3.execPath, args, { stdio: "inherit" });
        }
        if (!proc.killed) {
          const signals = ["SIGUSR1", "SIGUSR2", "SIGTERM", "SIGINT", "SIGHUP"];
          signals.forEach((signal) => {
            process3.on(signal, () => {
              if (proc.killed === false && proc.exitCode === null) {
                proc.kill(signal);
              }
            });
          });
        }
        const exitCallback = this._exitCallback;
        proc.on("close", (code) => {
          code = code ?? 1;
          if (!exitCallback) {
            process3.exit(code);
          } else {
            exitCallback(
              new CommanderError2(
                code,
                "commander.executeSubCommandAsync",
                "(close)"
              )
            );
          }
        });
        proc.on("error", (err) => {
          if (err.code === "ENOENT") {
            const executableDirMessage = executableDir ? `searched for local subcommand relative to directory '${executableDir}'` : "no directory for search for local subcommand, use .executableDir() to supply a custom directory";
            const executableMissing = `'${executableFile}' does not exist
 - if '${subcommand._name}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDirMessage}`;
            throw new Error(executableMissing);
          } else if (err.code === "EACCES") {
            throw new Error(`'${executableFile}' not executable`);
          }
          if (!exitCallback) {
            process3.exit(1);
          } else {
            const wrappedError = new CommanderError2(
              1,
              "commander.executeSubCommandAsync",
              "(error)"
            );
            wrappedError.nestedError = err;
            exitCallback(wrappedError);
          }
        });
        this.runningCommand = proc;
      }
      /**
       * @private
       */
      _dispatchSubcommand(commandName, operands, unknown) {
        const subCommand = this._findCommand(commandName);
        if (!subCommand) this.help({ error: true });
        let promiseChain;
        promiseChain = this._chainOrCallSubCommandHook(
          promiseChain,
          subCommand,
          "preSubcommand"
        );
        promiseChain = this._chainOrCall(promiseChain, () => {
          if (subCommand._executableHandler) {
            this._executeSubCommand(subCommand, operands.concat(unknown));
          } else {
            return subCommand._parseCommand(operands, unknown);
          }
        });
        return promiseChain;
      }
      /**
       * Invoke help directly if possible, or dispatch if necessary.
       * e.g. help foo
       *
       * @private
       */
      _dispatchHelpCommand(subcommandName) {
        if (!subcommandName) {
          this.help();
        }
        const subCommand = this._findCommand(subcommandName);
        if (subCommand && !subCommand._executableHandler) {
          subCommand.help();
        }
        return this._dispatchSubcommand(
          subcommandName,
          [],
          [this._getHelpOption()?.long ?? this._getHelpOption()?.short ?? "--help"]
        );
      }
      /**
       * Check this.args against expected this.registeredArguments.
       *
       * @private
       */
      _checkNumberOfArguments() {
        this.registeredArguments.forEach((arg, i2) => {
          if (arg.required && this.args[i2] == null) {
            this.missingArgument(arg.name());
          }
        });
        if (this.registeredArguments.length > 0 && this.registeredArguments[this.registeredArguments.length - 1].variadic) {
          return;
        }
        if (this.args.length > this.registeredArguments.length) {
          this._excessArguments(this.args);
        }
      }
      /**
       * Process this.args using this.registeredArguments and save as this.processedArgs!
       *
       * @private
       */
      _processArguments() {
        const myParseArg = (argument, value, previous) => {
          let parsedValue = value;
          if (value !== null && argument.parseArg) {
            const invalidValueMessage = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'.`;
            parsedValue = this._callParseArg(
              argument,
              value,
              previous,
              invalidValueMessage
            );
          }
          return parsedValue;
        };
        this._checkNumberOfArguments();
        const processedArgs = [];
        this.registeredArguments.forEach((declaredArg, index) => {
          let value = declaredArg.defaultValue;
          if (declaredArg.variadic) {
            if (index < this.args.length) {
              value = this.args.slice(index);
              if (declaredArg.parseArg) {
                value = value.reduce((processed, v) => {
                  return myParseArg(declaredArg, v, processed);
                }, declaredArg.defaultValue);
              }
            } else if (value === void 0) {
              value = [];
            }
          } else if (index < this.args.length) {
            value = this.args[index];
            if (declaredArg.parseArg) {
              value = myParseArg(declaredArg, value, declaredArg.defaultValue);
            }
          }
          processedArgs[index] = value;
        });
        this.processedArgs = processedArgs;
      }
      /**
       * Once we have a promise we chain, but call synchronously until then.
       *
       * @param {(Promise|undefined)} promise
       * @param {Function} fn
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCall(promise, fn) {
        if (promise && promise.then && typeof promise.then === "function") {
          return promise.then(() => fn());
        }
        return fn();
      }
      /**
       *
       * @param {(Promise|undefined)} promise
       * @param {string} event
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCallHooks(promise, event) {
        let result = promise;
        const hooks = [];
        this._getCommandAndAncestors().reverse().filter((cmd) => cmd._lifeCycleHooks[event] !== void 0).forEach((hookedCommand) => {
          hookedCommand._lifeCycleHooks[event].forEach((callback) => {
            hooks.push({ hookedCommand, callback });
          });
        });
        if (event === "postAction") {
          hooks.reverse();
        }
        hooks.forEach((hookDetail) => {
          result = this._chainOrCall(result, () => {
            return hookDetail.callback(hookDetail.hookedCommand, this);
          });
        });
        return result;
      }
      /**
       *
       * @param {(Promise|undefined)} promise
       * @param {Command} subCommand
       * @param {string} event
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCallSubCommandHook(promise, subCommand, event) {
        let result = promise;
        if (this._lifeCycleHooks[event] !== void 0) {
          this._lifeCycleHooks[event].forEach((hook) => {
            result = this._chainOrCall(result, () => {
              return hook(this, subCommand);
            });
          });
        }
        return result;
      }
      /**
       * Process arguments in context of this command.
       * Returns action result, in case it is a promise.
       *
       * @private
       */
      _parseCommand(operands, unknown) {
        const parsed = this.parseOptions(unknown);
        this._parseOptionsEnv();
        this._parseOptionsImplied();
        operands = operands.concat(parsed.operands);
        unknown = parsed.unknown;
        this.args = operands.concat(unknown);
        if (operands && this._findCommand(operands[0])) {
          return this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
        }
        if (this._getHelpCommand() && operands[0] === this._getHelpCommand().name()) {
          return this._dispatchHelpCommand(operands[1]);
        }
        if (this._defaultCommandName) {
          this._outputHelpIfRequested(unknown);
          return this._dispatchSubcommand(
            this._defaultCommandName,
            operands,
            unknown
          );
        }
        if (this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName) {
          this.help({ error: true });
        }
        this._outputHelpIfRequested(parsed.unknown);
        this._checkForMissingMandatoryOptions();
        this._checkForConflictingOptions();
        const checkForUnknownOptions = () => {
          if (parsed.unknown.length > 0) {
            this.unknownOption(parsed.unknown[0]);
          }
        };
        const commandEvent = `command:${this.name()}`;
        if (this._actionHandler) {
          checkForUnknownOptions();
          this._processArguments();
          let promiseChain;
          promiseChain = this._chainOrCallHooks(promiseChain, "preAction");
          promiseChain = this._chainOrCall(
            promiseChain,
            () => this._actionHandler(this.processedArgs)
          );
          if (this.parent) {
            promiseChain = this._chainOrCall(promiseChain, () => {
              this.parent.emit(commandEvent, operands, unknown);
            });
          }
          promiseChain = this._chainOrCallHooks(promiseChain, "postAction");
          return promiseChain;
        }
        if (this.parent && this.parent.listenerCount(commandEvent)) {
          checkForUnknownOptions();
          this._processArguments();
          this.parent.emit(commandEvent, operands, unknown);
        } else if (operands.length) {
          if (this._findCommand("*")) {
            return this._dispatchSubcommand("*", operands, unknown);
          }
          if (this.listenerCount("command:*")) {
            this.emit("command:*", operands, unknown);
          } else if (this.commands.length) {
            this.unknownCommand();
          } else {
            checkForUnknownOptions();
            this._processArguments();
          }
        } else if (this.commands.length) {
          checkForUnknownOptions();
          this.help({ error: true });
        } else {
          checkForUnknownOptions();
          this._processArguments();
        }
      }
      /**
       * Find matching command.
       *
       * @private
       * @return {Command | undefined}
       */
      _findCommand(name) {
        if (!name) return void 0;
        return this.commands.find(
          (cmd) => cmd._name === name || cmd._aliases.includes(name)
        );
      }
      /**
       * Return an option matching `arg` if any.
       *
       * @param {string} arg
       * @return {Option}
       * @package
       */
      _findOption(arg) {
        return this.options.find((option) => option.is(arg));
      }
      /**
       * Display an error message if a mandatory option does not have a value.
       * Called after checking for help flags in leaf subcommand.
       *
       * @private
       */
      _checkForMissingMandatoryOptions() {
        this._getCommandAndAncestors().forEach((cmd) => {
          cmd.options.forEach((anOption) => {
            if (anOption.mandatory && cmd.getOptionValue(anOption.attributeName()) === void 0) {
              cmd.missingMandatoryOptionValue(anOption);
            }
          });
        });
      }
      /**
       * Display an error message if conflicting options are used together in this.
       *
       * @private
       */
      _checkForConflictingLocalOptions() {
        const definedNonDefaultOptions = this.options.filter((option) => {
          const optionKey = option.attributeName();
          if (this.getOptionValue(optionKey) === void 0) {
            return false;
          }
          return this.getOptionValueSource(optionKey) !== "default";
        });
        const optionsWithConflicting = definedNonDefaultOptions.filter(
          (option) => option.conflictsWith.length > 0
        );
        optionsWithConflicting.forEach((option) => {
          const conflictingAndDefined = definedNonDefaultOptions.find(
            (defined) => option.conflictsWith.includes(defined.attributeName())
          );
          if (conflictingAndDefined) {
            this._conflictingOption(option, conflictingAndDefined);
          }
        });
      }
      /**
       * Display an error message if conflicting options are used together.
       * Called after checking for help flags in leaf subcommand.
       *
       * @private
       */
      _checkForConflictingOptions() {
        this._getCommandAndAncestors().forEach((cmd) => {
          cmd._checkForConflictingLocalOptions();
        });
      }
      /**
       * Parse options from `argv` removing known options,
       * and return argv split into operands and unknown arguments.
       *
       * Examples:
       *
       *     argv => operands, unknown
       *     --known kkk op => [op], []
       *     op --known kkk => [op], []
       *     sub --unknown uuu op => [sub], [--unknown uuu op]
       *     sub -- --unknown uuu op => [sub --unknown uuu op], []
       *
       * @param {string[]} argv
       * @return {{operands: string[], unknown: string[]}}
       */
      parseOptions(argv) {
        const operands = [];
        const unknown = [];
        let dest = operands;
        const args = argv.slice();
        function maybeOption(arg) {
          return arg.length > 1 && arg[0] === "-";
        }
        let activeVariadicOption = null;
        while (args.length) {
          const arg = args.shift();
          if (arg === "--") {
            if (dest === unknown) dest.push(arg);
            dest.push(...args);
            break;
          }
          if (activeVariadicOption && !maybeOption(arg)) {
            this.emit(`option:${activeVariadicOption.name()}`, arg);
            continue;
          }
          activeVariadicOption = null;
          if (maybeOption(arg)) {
            const option = this._findOption(arg);
            if (option) {
              if (option.required) {
                const value = args.shift();
                if (value === void 0) this.optionMissingArgument(option);
                this.emit(`option:${option.name()}`, value);
              } else if (option.optional) {
                let value = null;
                if (args.length > 0 && !maybeOption(args[0])) {
                  value = args.shift();
                }
                this.emit(`option:${option.name()}`, value);
              } else {
                this.emit(`option:${option.name()}`);
              }
              activeVariadicOption = option.variadic ? option : null;
              continue;
            }
          }
          if (arg.length > 2 && arg[0] === "-" && arg[1] !== "-") {
            const option = this._findOption(`-${arg[1]}`);
            if (option) {
              if (option.required || option.optional && this._combineFlagAndOptionalValue) {
                this.emit(`option:${option.name()}`, arg.slice(2));
              } else {
                this.emit(`option:${option.name()}`);
                args.unshift(`-${arg.slice(2)}`);
              }
              continue;
            }
          }
          if (/^--[^=]+=/.test(arg)) {
            const index = arg.indexOf("=");
            const option = this._findOption(arg.slice(0, index));
            if (option && (option.required || option.optional)) {
              this.emit(`option:${option.name()}`, arg.slice(index + 1));
              continue;
            }
          }
          if (maybeOption(arg)) {
            dest = unknown;
          }
          if ((this._enablePositionalOptions || this._passThroughOptions) && operands.length === 0 && unknown.length === 0) {
            if (this._findCommand(arg)) {
              operands.push(arg);
              if (args.length > 0) unknown.push(...args);
              break;
            } else if (this._getHelpCommand() && arg === this._getHelpCommand().name()) {
              operands.push(arg);
              if (args.length > 0) operands.push(...args);
              break;
            } else if (this._defaultCommandName) {
              unknown.push(arg);
              if (args.length > 0) unknown.push(...args);
              break;
            }
          }
          if (this._passThroughOptions) {
            dest.push(arg);
            if (args.length > 0) dest.push(...args);
            break;
          }
          dest.push(arg);
        }
        return { operands, unknown };
      }
      /**
       * Return an object containing local option values as key-value pairs.
       *
       * @return {object}
       */
      opts() {
        if (this._storeOptionsAsProperties) {
          const result = {};
          const len = this.options.length;
          for (let i2 = 0; i2 < len; i2++) {
            const key = this.options[i2].attributeName();
            result[key] = key === this._versionOptionName ? this._version : this[key];
          }
          return result;
        }
        return this._optionValues;
      }
      /**
       * Return an object containing merged local and global option values as key-value pairs.
       *
       * @return {object}
       */
      optsWithGlobals() {
        return this._getCommandAndAncestors().reduce(
          (combinedOptions, cmd) => Object.assign(combinedOptions, cmd.opts()),
          {}
        );
      }
      /**
       * Display error message and exit (or call exitOverride).
       *
       * @param {string} message
       * @param {object} [errorOptions]
       * @param {string} [errorOptions.code] - an id string representing the error
       * @param {number} [errorOptions.exitCode] - used with process.exit
       */
      error(message, errorOptions) {
        this._outputConfiguration.outputError(
          `${message}
`,
          this._outputConfiguration.writeErr
        );
        if (typeof this._showHelpAfterError === "string") {
          this._outputConfiguration.writeErr(`${this._showHelpAfterError}
`);
        } else if (this._showHelpAfterError) {
          this._outputConfiguration.writeErr("\n");
          this.outputHelp({ error: true });
        }
        const config = errorOptions || {};
        const exitCode = config.exitCode || 1;
        const code = config.code || "commander.error";
        this._exit(exitCode, code, message);
      }
      /**
       * Apply any option related environment variables, if option does
       * not have a value from cli or client code.
       *
       * @private
       */
      _parseOptionsEnv() {
        this.options.forEach((option) => {
          if (option.envVar && option.envVar in process3.env) {
            const optionKey = option.attributeName();
            if (this.getOptionValue(optionKey) === void 0 || ["default", "config", "env"].includes(
              this.getOptionValueSource(optionKey)
            )) {
              if (option.required || option.optional) {
                this.emit(`optionEnv:${option.name()}`, process3.env[option.envVar]);
              } else {
                this.emit(`optionEnv:${option.name()}`);
              }
            }
          }
        });
      }
      /**
       * Apply any implied option values, if option is undefined or default value.
       *
       * @private
       */
      _parseOptionsImplied() {
        const dualHelper = new DualOptions(this.options);
        const hasCustomOptionValue = (optionKey) => {
          return this.getOptionValue(optionKey) !== void 0 && !["default", "implied"].includes(this.getOptionValueSource(optionKey));
        };
        this.options.filter(
          (option) => option.implied !== void 0 && hasCustomOptionValue(option.attributeName()) && dualHelper.valueFromOption(
            this.getOptionValue(option.attributeName()),
            option
          )
        ).forEach((option) => {
          Object.keys(option.implied).filter((impliedKey) => !hasCustomOptionValue(impliedKey)).forEach((impliedKey) => {
            this.setOptionValueWithSource(
              impliedKey,
              option.implied[impliedKey],
              "implied"
            );
          });
        });
      }
      /**
       * Argument `name` is missing.
       *
       * @param {string} name
       * @private
       */
      missingArgument(name) {
        const message = `error: missing required argument '${name}'`;
        this.error(message, { code: "commander.missingArgument" });
      }
      /**
       * `Option` is missing an argument.
       *
       * @param {Option} option
       * @private
       */
      optionMissingArgument(option) {
        const message = `error: option '${option.flags}' argument missing`;
        this.error(message, { code: "commander.optionMissingArgument" });
      }
      /**
       * `Option` does not have a value, and is a mandatory option.
       *
       * @param {Option} option
       * @private
       */
      missingMandatoryOptionValue(option) {
        const message = `error: required option '${option.flags}' not specified`;
        this.error(message, { code: "commander.missingMandatoryOptionValue" });
      }
      /**
       * `Option` conflicts with another option.
       *
       * @param {Option} option
       * @param {Option} conflictingOption
       * @private
       */
      _conflictingOption(option, conflictingOption) {
        const findBestOptionFromValue = (option2) => {
          const optionKey = option2.attributeName();
          const optionValue = this.getOptionValue(optionKey);
          const negativeOption = this.options.find(
            (target) => target.negate && optionKey === target.attributeName()
          );
          const positiveOption = this.options.find(
            (target) => !target.negate && optionKey === target.attributeName()
          );
          if (negativeOption && (negativeOption.presetArg === void 0 && optionValue === false || negativeOption.presetArg !== void 0 && optionValue === negativeOption.presetArg)) {
            return negativeOption;
          }
          return positiveOption || option2;
        };
        const getErrorMessage2 = (option2) => {
          const bestOption = findBestOptionFromValue(option2);
          const optionKey = bestOption.attributeName();
          const source = this.getOptionValueSource(optionKey);
          if (source === "env") {
            return `environment variable '${bestOption.envVar}'`;
          }
          return `option '${bestOption.flags}'`;
        };
        const message = `error: ${getErrorMessage2(option)} cannot be used with ${getErrorMessage2(conflictingOption)}`;
        this.error(message, { code: "commander.conflictingOption" });
      }
      /**
       * Unknown option `flag`.
       *
       * @param {string} flag
       * @private
       */
      unknownOption(flag) {
        if (this._allowUnknownOption) return;
        let suggestion = "";
        if (flag.startsWith("--") && this._showSuggestionAfterError) {
          let candidateFlags = [];
          let command = this;
          do {
            const moreFlags = command.createHelp().visibleOptions(command).filter((option) => option.long).map((option) => option.long);
            candidateFlags = candidateFlags.concat(moreFlags);
            command = command.parent;
          } while (command && !command._enablePositionalOptions);
          suggestion = suggestSimilar(flag, candidateFlags);
        }
        const message = `error: unknown option '${flag}'${suggestion}`;
        this.error(message, { code: "commander.unknownOption" });
      }
      /**
       * Excess arguments, more than expected.
       *
       * @param {string[]} receivedArgs
       * @private
       */
      _excessArguments(receivedArgs) {
        if (this._allowExcessArguments) return;
        const expected = this.registeredArguments.length;
        const s = expected === 1 ? "" : "s";
        const forSubcommand = this.parent ? ` for '${this.name()}'` : "";
        const message = `error: too many arguments${forSubcommand}. Expected ${expected} argument${s} but got ${receivedArgs.length}.`;
        this.error(message, { code: "commander.excessArguments" });
      }
      /**
       * Unknown command.
       *
       * @private
       */
      unknownCommand() {
        const unknownName = this.args[0];
        let suggestion = "";
        if (this._showSuggestionAfterError) {
          const candidateNames = [];
          this.createHelp().visibleCommands(this).forEach((command) => {
            candidateNames.push(command.name());
            if (command.alias()) candidateNames.push(command.alias());
          });
          suggestion = suggestSimilar(unknownName, candidateNames);
        }
        const message = `error: unknown command '${unknownName}'${suggestion}`;
        this.error(message, { code: "commander.unknownCommand" });
      }
      /**
       * Get or set the program version.
       *
       * This method auto-registers the "-V, --version" option which will print the version number.
       *
       * You can optionally supply the flags and description to override the defaults.
       *
       * @param {string} [str]
       * @param {string} [flags]
       * @param {string} [description]
       * @return {(this | string | undefined)} `this` command for chaining, or version string if no arguments
       */
      version(str2, flags, description) {
        if (str2 === void 0) return this._version;
        this._version = str2;
        flags = flags || "-V, --version";
        description = description || "output the version number";
        const versionOption = this.createOption(flags, description);
        this._versionOptionName = versionOption.attributeName();
        this._registerOption(versionOption);
        this.on("option:" + versionOption.name(), () => {
          this._outputConfiguration.writeOut(`${str2}
`);
          this._exit(0, "commander.version", str2);
        });
        return this;
      }
      /**
       * Set the description.
       *
       * @param {string} [str]
       * @param {object} [argsDescription]
       * @return {(string|Command)}
       */
      description(str2, argsDescription) {
        if (str2 === void 0 && argsDescription === void 0)
          return this._description;
        this._description = str2;
        if (argsDescription) {
          this._argsDescription = argsDescription;
        }
        return this;
      }
      /**
       * Set the summary. Used when listed as subcommand of parent.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      summary(str2) {
        if (str2 === void 0) return this._summary;
        this._summary = str2;
        return this;
      }
      /**
       * Set an alias for the command.
       *
       * You may call more than once to add multiple aliases. Only the first alias is shown in the auto-generated help.
       *
       * @param {string} [alias]
       * @return {(string|Command)}
       */
      alias(alias) {
        if (alias === void 0) return this._aliases[0];
        let command = this;
        if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler) {
          command = this.commands[this.commands.length - 1];
        }
        if (alias === command._name)
          throw new Error("Command alias can't be the same as its name");
        const matchingCommand = this.parent?._findCommand(alias);
        if (matchingCommand) {
          const existingCmd = [matchingCommand.name()].concat(matchingCommand.aliases()).join("|");
          throw new Error(
            `cannot add alias '${alias}' to command '${this.name()}' as already have command '${existingCmd}'`
          );
        }
        command._aliases.push(alias);
        return this;
      }
      /**
       * Set aliases for the command.
       *
       * Only the first alias is shown in the auto-generated help.
       *
       * @param {string[]} [aliases]
       * @return {(string[]|Command)}
       */
      aliases(aliases) {
        if (aliases === void 0) return this._aliases;
        aliases.forEach((alias) => this.alias(alias));
        return this;
      }
      /**
       * Set / get the command usage `str`.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      usage(str2) {
        if (str2 === void 0) {
          if (this._usage) return this._usage;
          const args = this.registeredArguments.map((arg) => {
            return humanReadableArgName(arg);
          });
          return [].concat(
            this.options.length || this._helpOption !== null ? "[options]" : [],
            this.commands.length ? "[command]" : [],
            this.registeredArguments.length ? args : []
          ).join(" ");
        }
        this._usage = str2;
        return this;
      }
      /**
       * Get or set the name of the command.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      name(str2) {
        if (str2 === void 0) return this._name;
        this._name = str2;
        return this;
      }
      /**
       * Set the name of the command from script filename, such as process.argv[1],
       * or require.main.filename, or __filename.
       *
       * (Used internally and public although not documented in README.)
       *
       * @example
       * program.nameFromFilename(require.main.filename);
       *
       * @param {string} filename
       * @return {Command}
       */
      nameFromFilename(filename) {
        this._name = path.basename(filename, path.extname(filename));
        return this;
      }
      /**
       * Get or set the directory for searching for executable subcommands of this command.
       *
       * @example
       * program.executableDir(__dirname);
       * // or
       * program.executableDir('subcommands');
       *
       * @param {string} [path]
       * @return {(string|null|Command)}
       */
      executableDir(path2) {
        if (path2 === void 0) return this._executableDir;
        this._executableDir = path2;
        return this;
      }
      /**
       * Return program help documentation.
       *
       * @param {{ error: boolean }} [contextOptions] - pass {error:true} to wrap for stderr instead of stdout
       * @return {string}
       */
      helpInformation(contextOptions) {
        const helper = this.createHelp();
        if (helper.helpWidth === void 0) {
          helper.helpWidth = contextOptions && contextOptions.error ? this._outputConfiguration.getErrHelpWidth() : this._outputConfiguration.getOutHelpWidth();
        }
        return helper.formatHelp(this, helper);
      }
      /**
       * @private
       */
      _getHelpContext(contextOptions) {
        contextOptions = contextOptions || {};
        const context = { error: !!contextOptions.error };
        let write;
        if (context.error) {
          write = (arg) => this._outputConfiguration.writeErr(arg);
        } else {
          write = (arg) => this._outputConfiguration.writeOut(arg);
        }
        context.write = contextOptions.write || write;
        context.command = this;
        return context;
      }
      /**
       * Output help information for this command.
       *
       * Outputs built-in help, and custom text added using `.addHelpText()`.
       *
       * @param {{ error: boolean } | Function} [contextOptions] - pass {error:true} to write to stderr instead of stdout
       */
      outputHelp(contextOptions) {
        let deprecatedCallback;
        if (typeof contextOptions === "function") {
          deprecatedCallback = contextOptions;
          contextOptions = void 0;
        }
        const context = this._getHelpContext(contextOptions);
        this._getCommandAndAncestors().reverse().forEach((command) => command.emit("beforeAllHelp", context));
        this.emit("beforeHelp", context);
        let helpInformation = this.helpInformation(context);
        if (deprecatedCallback) {
          helpInformation = deprecatedCallback(helpInformation);
          if (typeof helpInformation !== "string" && !Buffer.isBuffer(helpInformation)) {
            throw new Error("outputHelp callback must return a string or a Buffer");
          }
        }
        context.write(helpInformation);
        if (this._getHelpOption()?.long) {
          this.emit(this._getHelpOption().long);
        }
        this.emit("afterHelp", context);
        this._getCommandAndAncestors().forEach(
          (command) => command.emit("afterAllHelp", context)
        );
      }
      /**
       * You can pass in flags and a description to customise the built-in help option.
       * Pass in false to disable the built-in help option.
       *
       * @example
       * program.helpOption('-?, --help' 'show help'); // customise
       * program.helpOption(false); // disable
       *
       * @param {(string | boolean)} flags
       * @param {string} [description]
       * @return {Command} `this` command for chaining
       */
      helpOption(flags, description) {
        if (typeof flags === "boolean") {
          if (flags) {
            this._helpOption = this._helpOption ?? void 0;
          } else {
            this._helpOption = null;
          }
          return this;
        }
        flags = flags ?? "-h, --help";
        description = description ?? "display help for command";
        this._helpOption = this.createOption(flags, description);
        return this;
      }
      /**
       * Lazy create help option.
       * Returns null if has been disabled with .helpOption(false).
       *
       * @returns {(Option | null)} the help option
       * @package
       */
      _getHelpOption() {
        if (this._helpOption === void 0) {
          this.helpOption(void 0, void 0);
        }
        return this._helpOption;
      }
      /**
       * Supply your own option to use for the built-in help option.
       * This is an alternative to using helpOption() to customise the flags and description etc.
       *
       * @param {Option} option
       * @return {Command} `this` command for chaining
       */
      addHelpOption(option) {
        this._helpOption = option;
        return this;
      }
      /**
       * Output help information and exit.
       *
       * Outputs built-in help, and custom text added using `.addHelpText()`.
       *
       * @param {{ error: boolean }} [contextOptions] - pass {error:true} to write to stderr instead of stdout
       */
      help(contextOptions) {
        this.outputHelp(contextOptions);
        let exitCode = process3.exitCode || 0;
        if (exitCode === 0 && contextOptions && typeof contextOptions !== "function" && contextOptions.error) {
          exitCode = 1;
        }
        this._exit(exitCode, "commander.help", "(outputHelp)");
      }
      /**
       * Add additional text to be displayed with the built-in help.
       *
       * Position is 'before' or 'after' to affect just this command,
       * and 'beforeAll' or 'afterAll' to affect this command and all its subcommands.
       *
       * @param {string} position - before or after built-in help
       * @param {(string | Function)} text - string to add, or a function returning a string
       * @return {Command} `this` command for chaining
       */
      addHelpText(position, text) {
        const allowedValues = ["beforeAll", "before", "after", "afterAll"];
        if (!allowedValues.includes(position)) {
          throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
        }
        const helpEvent = `${position}Help`;
        this.on(helpEvent, (context) => {
          let helpStr;
          if (typeof text === "function") {
            helpStr = text({ error: context.error, command: context.command });
          } else {
            helpStr = text;
          }
          if (helpStr) {
            context.write(`${helpStr}
`);
          }
        });
        return this;
      }
      /**
       * Output help information if help flags specified
       *
       * @param {Array} args - array of options to search for help flags
       * @private
       */
      _outputHelpIfRequested(args) {
        const helpOption = this._getHelpOption();
        const helpRequested = helpOption && args.find((arg) => helpOption.is(arg));
        if (helpRequested) {
          this.outputHelp();
          this._exit(0, "commander.helpDisplayed", "(outputHelp)");
        }
      }
    };
    function incrementNodeInspectorPort(args) {
      return args.map((arg) => {
        if (!arg.startsWith("--inspect")) {
          return arg;
        }
        let debugOption;
        let debugHost = "127.0.0.1";
        let debugPort = "9229";
        let match;
        if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) {
          debugOption = match[1];
        } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null) {
          debugOption = match[1];
          if (/^\d+$/.test(match[3])) {
            debugPort = match[3];
          } else {
            debugHost = match[3];
          }
        } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null) {
          debugOption = match[1];
          debugHost = match[3];
          debugPort = match[4];
        }
        if (debugOption && debugPort !== "0") {
          return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
        }
        return arg;
      });
    }
    exports.Command = Command2;
  }
});

// node_modules/commander/index.js
var require_commander = __commonJS({
  "node_modules/commander/index.js"(exports) {
    var { Argument: Argument2 } = require_argument();
    var { Command: Command2 } = require_command();
    var { CommanderError: CommanderError2, InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var { Help: Help2 } = require_help();
    var { Option: Option2 } = require_option();
    exports.program = new Command2();
    exports.createCommand = (name) => new Command2(name);
    exports.createOption = (flags, description) => new Option2(flags, description);
    exports.createArgument = (name, description) => new Argument2(name, description);
    exports.Command = Command2;
    exports.Option = Option2;
    exports.Argument = Argument2;
    exports.Help = Help2;
    exports.CommanderError = CommanderError2;
    exports.InvalidArgumentError = InvalidArgumentError2;
    exports.InvalidOptionArgumentError = InvalidArgumentError2;
  }
});

// src/spool/plugin-config.ts
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
function configPath() {
  return join(homedir(), ".vibebook", "config.json");
}
function defaultPluginConfig() {
  return {
    repoPath: join(homedir(), ".vibebook", "session-repo"),
    repoUrl: "",
    encrypt: false,
    salt: "",
    deviceBranch: "",
    runner: "claude-cli",
    enableAggregateCI: false,
    includeReasoning: true,
    threadingConcurrency: 4,
    threadingMaxAttempts: 3,
    digestEnabled: true
  };
}
function readPluginConfig() {
  if (!existsSync(configPath())) return defaultPluginConfig();
  try {
    const raw = readFileSync(configPath(), "utf8");
    return JSON.parse(raw);
  } catch {
    return defaultPluginConfig();
  }
}
var init_plugin_config = __esm({
  "src/spool/plugin-config.ts"() {
    "use strict";
  }
});

// src/_shared/repo-data-dir.ts
import { join as join2 } from "node:path";
function dataDirAbs(repoPath) {
  return join2(repoPath, REPO_DATA_DIR);
}
var REPO_DATA_DIR, INDEX_REL, BOOK_INDEX_REL, REPO_SALT_REL;
var init_repo_data_dir = __esm({
  "src/_shared/repo-data-dir.ts"() {
    "use strict";
    REPO_DATA_DIR = ".vibebook";
    INDEX_REL = `${REPO_DATA_DIR}/index.json`;
    BOOK_INDEX_REL = `${REPO_DATA_DIR}/index.book.json`;
    REPO_SALT_REL = `${REPO_DATA_DIR}/repo-salt.json`;
  }
});

// src/_shared/index-store.ts
import { mkdirSync, readFileSync as readFileSync2, writeFileSync, existsSync as existsSync2 } from "node:fs";
import { join as join3 } from "node:path";
function loadIndex(repoRoot) {
  const p2 = join3(repoRoot, INDEX_REL);
  if (!existsSync2(p2)) return { version: 1, entries: {} };
  const parsed = JSON.parse(readFileSync2(p2, "utf8"));
  if (parsed.version !== 1) throw new Error(`unsupported index version: ${parsed.version}`);
  return parsed;
}
function saveIndex(repoRoot, idx) {
  const p2 = join3(repoRoot, INDEX_REL);
  mkdirSync(dataDirAbs(repoRoot), { recursive: true });
  writeFileSync(p2, JSON.stringify(idx, null, 2) + "\n");
}
function keyFor(tool, sessionId) {
  return `${tool}:${sessionId}`;
}
function upsertEntry(idx, entry) {
  idx.entries[keyFor(entry.tool, entry.sessionId)] = entry;
}
function hasUnchanged(idx, tool, sessionId, mtimeMs, sha256) {
  const e = idx.entries[keyFor(tool, sessionId)];
  return !!e && e.sourceMtimeMs === mtimeMs && e.sourceSha256 === sha256;
}
var init_index_store = __esm({
  "src/_shared/index-store.ts"() {
    "use strict";
    init_repo_data_dir();
  }
});

// src/digest/book-index-v2.ts
import { mkdirSync as mkdirSync2, readFileSync as readFileSync3, writeFileSync as writeFileSync2, existsSync as existsSync3, copyFileSync } from "node:fs";
import { join as join4 } from "node:path";
function topicKey(project, topicSlug) {
  return `${project}/${topicSlug}`;
}
function cardKey(project, cardSlug) {
  return `${project}/${cardSlug}`;
}
function loadBookIndexV2(repoRoot) {
  const p2 = join4(repoRoot, BOOK_INDEX_REL);
  if (!existsSync3(p2)) {
    return { version: 2, chronicles: {}, topics: {}, cards: {} };
  }
  const parsed = JSON.parse(readFileSync3(p2, "utf8"));
  if (parsed.version === 2) return validateV2(parsed);
  if (parsed.version === 1) {
    const v1 = parsed;
    const migrated = migrateV1ToV2(v1);
    try {
      copyFileSync(p2, p2 + ".v1.bak");
    } catch {
    }
    saveBookIndexV2(repoRoot, migrated);
    return migrated;
  }
  throw new Error(`unsupported book index version: ${parsed.version}`);
}
function saveBookIndexV2(repoRoot, idx) {
  mkdirSync2(dataDirAbs(repoRoot), { recursive: true });
  writeFileSync2(join4(repoRoot, BOOK_INDEX_REL), JSON.stringify(idx, null, 2) + "\n");
}
function validateV2(idx) {
  if (idx.version !== 2) throw new Error(`expected v2, got ${idx.version}`);
  if (!idx.chronicles || typeof idx.chronicles !== "object") {
    throw new Error("index.book.json v2 malformed: missing 'chronicles'");
  }
  if (!idx.topics || typeof idx.topics !== "object") {
    throw new Error("index.book.json v2 malformed: missing 'topics'");
  }
  if (!idx.cards || typeof idx.cards !== "object") {
    throw new Error("index.book.json v2 malformed: missing 'cards'");
  }
  return idx;
}
function migrateV1ToV2(v1) {
  const chronicles = {};
  for (const [threadId, t2] of Object.entries(v1.threads)) {
    chronicles[threadId] = {
      threadId,
      project: t2.project,
      title: t2.title,
      sessionIds: t2.sessionIds,
      // v1 articlePath was book/<proj>/articles/<file>.md; we keep that path
      // verbatim — `vibebook publish` won't touch it because v2 chronicles
      // live under book/<proj>/chronicle/, so the old article files just
      // become orphaned data on disk. User can delete manually.
      path: t2.articlePath,
      createdAt: t2.updatedAt,
      updatedAt: t2.updatedAt,
      tags: [],
      ...t2.skip ? { skip: true, skipReason: t2.skipReason } : {}
    };
  }
  return { version: 2, chronicles, topics: {}, cards: {} };
}
function insertChronicle(idx, entry) {
  if (idx.chronicles[entry.threadId]) {
    throw new Error(
      `chronicle threadId '${entry.threadId}' already exists (at ${idx.chronicles[entry.threadId].path}). Refusing to insert.`
    );
  }
  idx.chronicles[entry.threadId] = entry;
}
function upsertTopic(idx, entry) {
  idx.topics[topicKey(entry.project, entry.topicSlug)] = entry;
}
function upsertCard(idx, entry) {
  idx.cards[cardKey(entry.project, entry.cardSlug)] = entry;
}
var init_book_index_v2 = __esm({
  "src/digest/book-index-v2.ts"() {
    "use strict";
    init_repo_data_dir();
  }
});

// src/_shared/digest/project-filter.ts
function isRealProjectPath(slugOrPath) {
  if (!slugOrPath || slugOrPath === "root" || slugOrPath === "home") return false;
  const lower = slugOrPath.toLowerCase();
  if (lower.includes(".worktrees-")) return false;
  if (lower.endsWith(".code-workspace") || lower.endsWith("-workspacestorage")) return false;
  if (lower.endsWith("-workspace.json")) return false;
  if (/^\d{10,}/.test(slugOrPath)) return false;
  if (/^[a-f0-9]{20,}$/.test(slugOrPath)) return false;
  return true;
}
var init_project_filter = __esm({
  "src/_shared/digest/project-filter.ts"() {
    "use strict";
  }
});

// src/commands/list-projects.ts
var list_projects_exports = {};
__export(list_projects_exports, {
  buildListProjectsPayload: () => buildListProjectsPayload,
  listProjectsCmd: () => listProjectsCmd
});
function buildListProjectsPayload(cwd = process.cwd()) {
  const cfg = readPluginConfig();
  const indexFile = loadIndex(cfg.repoPath);
  const bookIndex = loadBookIndexV2(cfg.repoPath);
  const consumed = /* @__PURE__ */ new Set();
  for (const c3 of Object.values(bookIndex.chronicles)) {
    for (const sid of c3.sessionIds ?? []) consumed.add(sid);
  }
  const stats = /* @__PURE__ */ new Map();
  const ensure = (project) => {
    let s = stats.get(project);
    if (!s) {
      s = {
        project,
        totalSessions: 0,
        consumedSessions: 0,
        pendingSessions: 0,
        chronicles: 0,
        topics: 0,
        cards: 0,
        lastTouchedAt: null
      };
      stats.set(project, s);
    }
    return s;
  };
  for (const e of Object.values(indexFile.entries)) {
    if (!isRealProjectPath(e.project)) continue;
    const s = ensure(e.project);
    s.totalSessions++;
    if (consumed.has(e.sessionId)) s.consumedSessions++;
  }
  for (const c3 of Object.values(bookIndex.chronicles)) {
    if (!isRealProjectPath(c3.project)) continue;
    const s = ensure(c3.project);
    if (!c3.skip) s.chronicles++;
    s.lastTouchedAt = laterOf(s.lastTouchedAt, c3.updatedAt);
  }
  for (const t2 of Object.values(bookIndex.topics)) {
    const s = ensure(t2.project);
    s.topics++;
    s.lastTouchedAt = laterOf(s.lastTouchedAt, t2.updatedAt);
  }
  for (const c3 of Object.values(bookIndex.cards)) {
    const s = ensure(c3.project);
    s.cards++;
    s.lastTouchedAt = laterOf(s.lastTouchedAt, c3.updatedAt);
  }
  for (const s of stats.values()) {
    s.pendingSessions = s.totalSessions - s.consumedSessions;
  }
  const projects = [...stats.values()].sort((a, b2) => {
    if (a.pendingSessions !== b2.pendingSessions) return b2.pendingSessions - a.pendingSessions;
    return a.project.localeCompare(b2.project);
  });
  return {
    projects,
    meta: {
      isInSessionRepo: pathsEqual(cwd, cfg.repoPath),
      sessionRepoPath: cfg.repoPath
    }
  };
}
function laterOf(a, b2) {
  if (!a) return b2;
  return a > b2 ? a : b2;
}
function pathsEqual(a, b2) {
  const trim = (p2) => p2.replace(/\/+$/, "");
  return trim(a) === trim(b2);
}
async function listProjectsCmd() {
  const payload = buildListProjectsPayload();
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
}
var init_list_projects = __esm({
  "src/commands/list-projects.ts"() {
    "use strict";
    init_plugin_config();
    init_index_store();
    init_book_index_v2();
    init_project_filter();
  }
});

// src/_shared/digest/session-signal.ts
function isVibebookMetaSession(mdBody) {
  const userTexts = extractUserTexts(mdBody);
  const first2 = (userTexts[0] ?? "").trimStart();
  if (/^\/vibebook(\b|$)/i.test(first2)) return true;
  if (/^\/loop\s+\/vibebook(\b|$)/i.test(first2)) return true;
  if (first2.includes("skills/vibebook/SKILL.md")) return true;
  return false;
}
function extractSessionSignals(mdBody) {
  const userTexts = extractUserTexts(mdBody);
  const joined = userTexts.join(" ").replace(/\s+/g, " ").trim();
  const titleSrc = userTexts[0] ?? "";
  const titleClean = titleSrc.replace(/\s+/g, " ").trim();
  const title = titleClean.length > 80 ? titleClean.slice(0, 80) : titleClean;
  const preview = joined.length > 300 ? joined.slice(0, 300) + "\u2026" : joined;
  const score = scoreText(joined, userTexts.join(" ").length, mdBody.length);
  return { title, preview, insightScore: score };
}
function extractUserTexts(md) {
  const out = [];
  const lines = md.split("\n");
  let inUser = false;
  let buf = [];
  for (const line of lines) {
    if (/^## User\b/.test(line)) {
      if (buf.length > 0) {
        out.push(buf.join("\n").trim());
        buf = [];
      }
      inUser = true;
      continue;
    }
    if (/^## /.test(line)) {
      if (inUser && buf.length > 0) {
        out.push(buf.join("\n").trim());
        buf = [];
      }
      inUser = false;
      continue;
    }
    if (inUser) buf.push(line);
  }
  if (inUser && buf.length > 0) out.push(buf.join("\n").trim());
  return out.filter((s) => s.length > 0);
}
function scoreText(joinedLower, userTextLen, totalLen) {
  if (!joinedLower) return 0;
  const lower = joinedLower.toLowerCase();
  let categoryHits = 0;
  let totalHits = 0;
  for (const keywords of Object.values(SIGNAL_CATEGORIES)) {
    const hits = keywords.filter((kw) => lower.includes(kw)).length;
    if (hits > 0) {
      categoryHits++;
      totalHits += hits;
    }
  }
  if (categoryHits < 2) return 0.1;
  const userRatio = userTextLen / Math.max(totalLen, 1);
  const score = categoryHits / 5 * 0.4 + totalHits / 15 * 0.3 + userRatio * 0.3;
  return Math.min(1, score);
}
var SIGNAL_CATEGORIES;
var init_session_signal = __esm({
  "src/_shared/digest/session-signal.ts"() {
    "use strict";
    SIGNAL_CATEGORIES = {
      debugging: ["bug", "error", "fix", "debug", "root cause", "traceback", "broken", "\u95EE\u9898", "\u4FEE\u590D"],
      architecture: ["architecture", "design", "pattern", "trade-off", "decision", "approach", "\u67B6\u6784", "\u8BBE\u8BA1"],
      discovery: ["learned", "discovered", "insight", "gotcha", "trap", "pitfall", "trick", "\u53D1\u73B0", "\u9677\u9631", "\u5173\u952E"],
      reasoning: ["because", "instead of", "rather than", "why", "the reason", "\u539F\u56E0", "\u6240\u4EE5", "\u56E0\u4E3A"],
      evaluation: ["review", "evaluate", "score", "verdict", "assessment", "\u8BC4\u4F30", "\u5BA1\u67E5"]
    };
  }
});

// src/_shared/slug.ts
function deriveSlug(firstUserMessage) {
  const collapsed = firstUserMessage.trim().replace(/\s+/g, " ");
  const display = collapsed.slice(0, 120) || "untitled";
  let slug = collapsed.replace(UNSAFE, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  slug = slug.slice(0, 60);
  if (!slug) slug = "untitled";
  return { slug, display };
}
function projectSlugFromPath(cwdOrPath) {
  if (!cwdOrPath || cwdOrPath === "/") return "root";
  const parts = cwdOrPath.split("/").filter(Boolean);
  if (parts.length === 0) return "root";
  if (parts.length === 1) return parts[0];
  const last2 = parts[parts.length - 1];
  const parent = parts[parts.length - 2];
  if (parent === "Users" || parent === "home") return "home";
  return `${parent}-${last2}`;
}
var UNSAFE;
var init_slug = __esm({
  "src/_shared/slug.ts"() {
    "use strict";
    UNSAFE = /[\\/:*?"<>|\s.,;!()[\]{}@#$%^&+=`~]+/g;
  }
});

// src/_shared/project-resolve.ts
function resolveProjectFromCwd(cwd, repoPath) {
  const indexFile = loadIndex(repoPath);
  return resolveProjectFromCwdWithIndex(cwd, indexFile.entries);
}
function resolveProjectFromCwdWithIndex(cwd, entries) {
  const slug = projectSlugFromPath(cwd);
  for (const e of Object.values(entries)) {
    if (e.project === slug) return slug;
  }
  for (const e of Object.values(entries)) {
    if (e.projectRaw === cwd) return e.project;
  }
  return null;
}
var init_project_resolve = __esm({
  "src/_shared/project-resolve.ts"() {
    "use strict";
    init_index_store();
    init_slug();
  }
});

// src/commands/prepare.ts
var prepare_exports = {};
__export(prepare_exports, {
  buildPreparePayload: () => buildPreparePayload,
  prepareCmd: () => prepareCmd
});
import { readFileSync as readFileSync4, existsSync as existsSync4 } from "node:fs";
import { join as join5 } from "node:path";
function buildPreparePayload(opts = {}) {
  const cfg = readPluginConfig();
  const indexFile = loadIndex(cfg.repoPath);
  const bookIndex = loadBookIndexV2(cfg.repoPath);
  let projectFilter = opts.project?.trim() || null;
  if (!projectFilter && opts.cwd) {
    projectFilter = resolveProjectFromCwdWithIndex(opts.cwd, indexFile.entries);
    if (!projectFilter) {
      throw new Error(
        `no synced sessions found for cwd '${opts.cwd}' (derived slug '${projectSlugFromPath(opts.cwd)}'). Run \`vibebook sync\` first or pass --project explicitly.`
      );
    }
  }
  const consumed = /* @__PURE__ */ new Set();
  for (const c3 of Object.values(bookIndex.chronicles)) {
    for (const sid of c3.sessionIds) consumed.add(sid);
  }
  const meta = {
    totalSessionsInIndex: 0,
    sessionsAlreadyChronicled: 0,
    sessionsFilteredByProject: 0,
    sessionsFilteredAsPseudoProject: 0,
    sessionsFilteredAsVibebookMeta: 0,
    newSessionsCount: 0
  };
  const newSessions = [];
  for (const entry of Object.values(indexFile.entries)) {
    meta.totalSessionsInIndex++;
    if (consumed.has(entry.sessionId)) {
      meta.sessionsAlreadyChronicled++;
      continue;
    }
    if (!isRealProjectPath(entry.project)) {
      meta.sessionsFilteredAsPseudoProject++;
      continue;
    }
    if (projectFilter && entry.project !== projectFilter) {
      meta.sessionsFilteredByProject++;
      continue;
    }
    const mdRel = mdPathFor(entry);
    const mdAbs = join5(cfg.repoPath, mdRel);
    if (!existsSync4(mdAbs)) {
      continue;
    }
    const mdBody = readFileSync4(mdAbs, "utf8");
    if (isVibebookMetaSession(mdBody)) {
      meta.sessionsFilteredAsVibebookMeta++;
      continue;
    }
    const signals = extractSessionSignals(mdBody);
    newSessions.push({
      sessionId: entry.sessionId,
      shortId: entry.shortId,
      tool: entry.tool,
      project: entry.project,
      startedAt: entry.startedAt,
      endedAt: entry.endedAt,
      nameSlug: entry.nameSlug,
      displayName: entry.displayName,
      mdPath: mdRel,
      preview: signals.preview,
      insightScore: signals.insightScore
    });
  }
  newSessions.sort((a, b2) => a.endedAt < b2.endedAt ? -1 : a.endedAt > b2.endedAt ? 1 : 0);
  meta.newSessionsCount = newSessions.length;
  const existingTopics = {};
  for (const t2 of Object.values(bookIndex.topics)) {
    (existingTopics[t2.project] ??= []).push(t2.topicSlug);
  }
  for (const list of Object.values(existingTopics)) list.sort();
  const existingCards = {};
  for (const c3 of Object.values(bookIndex.cards)) {
    (existingCards[c3.project] ??= []).push(c3.cardSlug);
  }
  for (const list of Object.values(existingCards)) list.sort();
  return {
    project: projectFilter,
    newSessions,
    existingTopics,
    existingCards,
    meta
  };
}
function mdPathFor(entry) {
  return entry.relativePath.replace(/\.raw\.json(\.enc)?$/, `.md`);
}
async function prepareCmd(opts) {
  const payload = buildPreparePayload(opts);
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
}
var init_prepare = __esm({
  "src/commands/prepare.ts"() {
    "use strict";
    init_plugin_config();
    init_index_store();
    init_book_index_v2();
    init_session_signal();
    init_project_filter();
    init_slug();
    init_project_resolve();
  }
});

// node_modules/chalk/source/vendor/ansi-styles/index.js
function assembleStyles() {
  const codes = /* @__PURE__ */ new Map();
  for (const [groupName, group] of Object.entries(styles)) {
    for (const [styleName, style] of Object.entries(group)) {
      styles[styleName] = {
        open: `\x1B[${style[0]}m`,
        close: `\x1B[${style[1]}m`
      };
      group[styleName] = styles[styleName];
      codes.set(style[0], style[1]);
    }
    Object.defineProperty(styles, groupName, {
      value: group,
      enumerable: false
    });
  }
  Object.defineProperty(styles, "codes", {
    value: codes,
    enumerable: false
  });
  styles.color.close = "\x1B[39m";
  styles.bgColor.close = "\x1B[49m";
  styles.color.ansi = wrapAnsi16();
  styles.color.ansi256 = wrapAnsi256();
  styles.color.ansi16m = wrapAnsi16m();
  styles.bgColor.ansi = wrapAnsi16(ANSI_BACKGROUND_OFFSET);
  styles.bgColor.ansi256 = wrapAnsi256(ANSI_BACKGROUND_OFFSET);
  styles.bgColor.ansi16m = wrapAnsi16m(ANSI_BACKGROUND_OFFSET);
  Object.defineProperties(styles, {
    rgbToAnsi256: {
      value(red, green, blue) {
        if (red === green && green === blue) {
          if (red < 8) {
            return 16;
          }
          if (red > 248) {
            return 231;
          }
          return Math.round((red - 8) / 247 * 24) + 232;
        }
        return 16 + 36 * Math.round(red / 255 * 5) + 6 * Math.round(green / 255 * 5) + Math.round(blue / 255 * 5);
      },
      enumerable: false
    },
    hexToRgb: {
      value(hex) {
        const matches = /[a-f\d]{6}|[a-f\d]{3}/i.exec(hex.toString(16));
        if (!matches) {
          return [0, 0, 0];
        }
        let [colorString] = matches;
        if (colorString.length === 3) {
          colorString = [...colorString].map((character) => character + character).join("");
        }
        const integer = Number.parseInt(colorString, 16);
        return [
          /* eslint-disable no-bitwise */
          integer >> 16 & 255,
          integer >> 8 & 255,
          integer & 255
          /* eslint-enable no-bitwise */
        ];
      },
      enumerable: false
    },
    hexToAnsi256: {
      value: (hex) => styles.rgbToAnsi256(...styles.hexToRgb(hex)),
      enumerable: false
    },
    ansi256ToAnsi: {
      value(code) {
        if (code < 8) {
          return 30 + code;
        }
        if (code < 16) {
          return 90 + (code - 8);
        }
        let red;
        let green;
        let blue;
        if (code >= 232) {
          red = ((code - 232) * 10 + 8) / 255;
          green = red;
          blue = red;
        } else {
          code -= 16;
          const remainder = code % 36;
          red = Math.floor(code / 36) / 5;
          green = Math.floor(remainder / 6) / 5;
          blue = remainder % 6 / 5;
        }
        const value = Math.max(red, green, blue) * 2;
        if (value === 0) {
          return 30;
        }
        let result = 30 + (Math.round(blue) << 2 | Math.round(green) << 1 | Math.round(red));
        if (value === 2) {
          result += 60;
        }
        return result;
      },
      enumerable: false
    },
    rgbToAnsi: {
      value: (red, green, blue) => styles.ansi256ToAnsi(styles.rgbToAnsi256(red, green, blue)),
      enumerable: false
    },
    hexToAnsi: {
      value: (hex) => styles.ansi256ToAnsi(styles.hexToAnsi256(hex)),
      enumerable: false
    }
  });
  return styles;
}
var ANSI_BACKGROUND_OFFSET, wrapAnsi16, wrapAnsi256, wrapAnsi16m, styles, modifierNames, foregroundColorNames, backgroundColorNames, colorNames, ansiStyles, ansi_styles_default;
var init_ansi_styles = __esm({
  "node_modules/chalk/source/vendor/ansi-styles/index.js"() {
    ANSI_BACKGROUND_OFFSET = 10;
    wrapAnsi16 = (offset = 0) => (code) => `\x1B[${code + offset}m`;
    wrapAnsi256 = (offset = 0) => (code) => `\x1B[${38 + offset};5;${code}m`;
    wrapAnsi16m = (offset = 0) => (red, green, blue) => `\x1B[${38 + offset};2;${red};${green};${blue}m`;
    styles = {
      modifier: {
        reset: [0, 0],
        // 21 isn't widely supported and 22 does the same thing
        bold: [1, 22],
        dim: [2, 22],
        italic: [3, 23],
        underline: [4, 24],
        overline: [53, 55],
        inverse: [7, 27],
        hidden: [8, 28],
        strikethrough: [9, 29]
      },
      color: {
        black: [30, 39],
        red: [31, 39],
        green: [32, 39],
        yellow: [33, 39],
        blue: [34, 39],
        magenta: [35, 39],
        cyan: [36, 39],
        white: [37, 39],
        // Bright color
        blackBright: [90, 39],
        gray: [90, 39],
        // Alias of `blackBright`
        grey: [90, 39],
        // Alias of `blackBright`
        redBright: [91, 39],
        greenBright: [92, 39],
        yellowBright: [93, 39],
        blueBright: [94, 39],
        magentaBright: [95, 39],
        cyanBright: [96, 39],
        whiteBright: [97, 39]
      },
      bgColor: {
        bgBlack: [40, 49],
        bgRed: [41, 49],
        bgGreen: [42, 49],
        bgYellow: [43, 49],
        bgBlue: [44, 49],
        bgMagenta: [45, 49],
        bgCyan: [46, 49],
        bgWhite: [47, 49],
        // Bright color
        bgBlackBright: [100, 49],
        bgGray: [100, 49],
        // Alias of `bgBlackBright`
        bgGrey: [100, 49],
        // Alias of `bgBlackBright`
        bgRedBright: [101, 49],
        bgGreenBright: [102, 49],
        bgYellowBright: [103, 49],
        bgBlueBright: [104, 49],
        bgMagentaBright: [105, 49],
        bgCyanBright: [106, 49],
        bgWhiteBright: [107, 49]
      }
    };
    modifierNames = Object.keys(styles.modifier);
    foregroundColorNames = Object.keys(styles.color);
    backgroundColorNames = Object.keys(styles.bgColor);
    colorNames = [...foregroundColorNames, ...backgroundColorNames];
    ansiStyles = assembleStyles();
    ansi_styles_default = ansiStyles;
  }
});

// node_modules/chalk/source/vendor/supports-color/index.js
import process2 from "node:process";
import os from "node:os";
import tty from "node:tty";
function hasFlag(flag, argv = globalThis.Deno ? globalThis.Deno.args : process2.argv) {
  const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
  const position = argv.indexOf(prefix + flag);
  const terminatorPosition = argv.indexOf("--");
  return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
}
function envForceColor() {
  if ("FORCE_COLOR" in env) {
    if (env.FORCE_COLOR === "true") {
      return 1;
    }
    if (env.FORCE_COLOR === "false") {
      return 0;
    }
    return env.FORCE_COLOR.length === 0 ? 1 : Math.min(Number.parseInt(env.FORCE_COLOR, 10), 3);
  }
}
function translateLevel(level) {
  if (level === 0) {
    return false;
  }
  return {
    level,
    hasBasic: true,
    has256: level >= 2,
    has16m: level >= 3
  };
}
function _supportsColor(haveStream, { streamIsTTY, sniffFlags = true } = {}) {
  const noFlagForceColor = envForceColor();
  if (noFlagForceColor !== void 0) {
    flagForceColor = noFlagForceColor;
  }
  const forceColor = sniffFlags ? flagForceColor : noFlagForceColor;
  if (forceColor === 0) {
    return 0;
  }
  if (sniffFlags) {
    if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor")) {
      return 3;
    }
    if (hasFlag("color=256")) {
      return 2;
    }
  }
  if ("TF_BUILD" in env && "AGENT_NAME" in env) {
    return 1;
  }
  if (haveStream && !streamIsTTY && forceColor === void 0) {
    return 0;
  }
  const min = forceColor || 0;
  if (env.TERM === "dumb") {
    return min;
  }
  if (process2.platform === "win32") {
    const osRelease = os.release().split(".");
    if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
      return Number(osRelease[2]) >= 14931 ? 3 : 2;
    }
    return 1;
  }
  if ("CI" in env) {
    if (["GITHUB_ACTIONS", "GITEA_ACTIONS", "CIRCLECI"].some((key) => key in env)) {
      return 3;
    }
    if (["TRAVIS", "APPVEYOR", "GITLAB_CI", "BUILDKITE", "DRONE"].some((sign) => sign in env) || env.CI_NAME === "codeship") {
      return 1;
    }
    return min;
  }
  if ("TEAMCITY_VERSION" in env) {
    return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
  }
  if (env.COLORTERM === "truecolor") {
    return 3;
  }
  if (env.TERM === "xterm-kitty") {
    return 3;
  }
  if (env.TERM === "xterm-ghostty") {
    return 3;
  }
  if (env.TERM === "wezterm") {
    return 3;
  }
  if ("TERM_PROGRAM" in env) {
    const version = Number.parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
    switch (env.TERM_PROGRAM) {
      case "iTerm.app": {
        return version >= 3 ? 3 : 2;
      }
      case "Apple_Terminal": {
        return 2;
      }
    }
  }
  if (/-256(color)?$/i.test(env.TERM)) {
    return 2;
  }
  if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
    return 1;
  }
  if ("COLORTERM" in env) {
    return 1;
  }
  return min;
}
function createSupportsColor(stream, options = {}) {
  const level = _supportsColor(stream, {
    streamIsTTY: stream && stream.isTTY,
    ...options
  });
  return translateLevel(level);
}
var env, flagForceColor, supportsColor, supports_color_default;
var init_supports_color = __esm({
  "node_modules/chalk/source/vendor/supports-color/index.js"() {
    ({ env } = process2);
    if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false") || hasFlag("color=never")) {
      flagForceColor = 0;
    } else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always")) {
      flagForceColor = 1;
    }
    supportsColor = {
      stdout: createSupportsColor({ isTTY: tty.isatty(1) }),
      stderr: createSupportsColor({ isTTY: tty.isatty(2) })
    };
    supports_color_default = supportsColor;
  }
});

// node_modules/chalk/source/utilities.js
function stringReplaceAll(string, substring, replacer) {
  let index = string.indexOf(substring);
  if (index === -1) {
    return string;
  }
  const substringLength = substring.length;
  let endIndex = 0;
  let returnValue = "";
  do {
    returnValue += string.slice(endIndex, index) + substring + replacer;
    endIndex = index + substringLength;
    index = string.indexOf(substring, endIndex);
  } while (index !== -1);
  returnValue += string.slice(endIndex);
  return returnValue;
}
function stringEncaseCRLFWithFirstIndex(string, prefix, postfix, index) {
  let endIndex = 0;
  let returnValue = "";
  do {
    const gotCR = string[index - 1] === "\r";
    returnValue += string.slice(endIndex, gotCR ? index - 1 : index) + prefix + (gotCR ? "\r\n" : "\n") + postfix;
    endIndex = index + 1;
    index = string.indexOf("\n", endIndex);
  } while (index !== -1);
  returnValue += string.slice(endIndex);
  return returnValue;
}
var init_utilities = __esm({
  "node_modules/chalk/source/utilities.js"() {
  }
});

// node_modules/chalk/source/index.js
function createChalk(options) {
  return chalkFactory(options);
}
var stdoutColor, stderrColor, GENERATOR, STYLER, IS_EMPTY, levelMapping, styles2, applyOptions, chalkFactory, getModelAnsi, usedModels, proto, createStyler, createBuilder, applyStyle, chalk, chalkStderr, source_default;
var init_source = __esm({
  "node_modules/chalk/source/index.js"() {
    init_ansi_styles();
    init_supports_color();
    init_utilities();
    ({ stdout: stdoutColor, stderr: stderrColor } = supports_color_default);
    GENERATOR = Symbol("GENERATOR");
    STYLER = Symbol("STYLER");
    IS_EMPTY = Symbol("IS_EMPTY");
    levelMapping = [
      "ansi",
      "ansi",
      "ansi256",
      "ansi16m"
    ];
    styles2 = /* @__PURE__ */ Object.create(null);
    applyOptions = (object, options = {}) => {
      if (options.level && !(Number.isInteger(options.level) && options.level >= 0 && options.level <= 3)) {
        throw new Error("The `level` option should be an integer from 0 to 3");
      }
      const colorLevel = stdoutColor ? stdoutColor.level : 0;
      object.level = options.level === void 0 ? colorLevel : options.level;
    };
    chalkFactory = (options) => {
      const chalk2 = (...strings) => strings.join(" ");
      applyOptions(chalk2, options);
      Object.setPrototypeOf(chalk2, createChalk.prototype);
      return chalk2;
    };
    Object.setPrototypeOf(createChalk.prototype, Function.prototype);
    for (const [styleName, style] of Object.entries(ansi_styles_default)) {
      styles2[styleName] = {
        get() {
          const builder = createBuilder(this, createStyler(style.open, style.close, this[STYLER]), this[IS_EMPTY]);
          Object.defineProperty(this, styleName, { value: builder });
          return builder;
        }
      };
    }
    styles2.visible = {
      get() {
        const builder = createBuilder(this, this[STYLER], true);
        Object.defineProperty(this, "visible", { value: builder });
        return builder;
      }
    };
    getModelAnsi = (model, level, type, ...arguments_) => {
      if (model === "rgb") {
        if (level === "ansi16m") {
          return ansi_styles_default[type].ansi16m(...arguments_);
        }
        if (level === "ansi256") {
          return ansi_styles_default[type].ansi256(ansi_styles_default.rgbToAnsi256(...arguments_));
        }
        return ansi_styles_default[type].ansi(ansi_styles_default.rgbToAnsi(...arguments_));
      }
      if (model === "hex") {
        return getModelAnsi("rgb", level, type, ...ansi_styles_default.hexToRgb(...arguments_));
      }
      return ansi_styles_default[type][model](...arguments_);
    };
    usedModels = ["rgb", "hex", "ansi256"];
    for (const model of usedModels) {
      styles2[model] = {
        get() {
          const { level } = this;
          return function(...arguments_) {
            const styler = createStyler(getModelAnsi(model, levelMapping[level], "color", ...arguments_), ansi_styles_default.color.close, this[STYLER]);
            return createBuilder(this, styler, this[IS_EMPTY]);
          };
        }
      };
      const bgModel = "bg" + model[0].toUpperCase() + model.slice(1);
      styles2[bgModel] = {
        get() {
          const { level } = this;
          return function(...arguments_) {
            const styler = createStyler(getModelAnsi(model, levelMapping[level], "bgColor", ...arguments_), ansi_styles_default.bgColor.close, this[STYLER]);
            return createBuilder(this, styler, this[IS_EMPTY]);
          };
        }
      };
    }
    proto = Object.defineProperties(() => {
    }, {
      ...styles2,
      level: {
        enumerable: true,
        get() {
          return this[GENERATOR].level;
        },
        set(level) {
          this[GENERATOR].level = level;
        }
      }
    });
    createStyler = (open, close, parent) => {
      let openAll;
      let closeAll;
      if (parent === void 0) {
        openAll = open;
        closeAll = close;
      } else {
        openAll = parent.openAll + open;
        closeAll = close + parent.closeAll;
      }
      return {
        open,
        close,
        openAll,
        closeAll,
        parent
      };
    };
    createBuilder = (self, _styler, _isEmpty) => {
      const builder = (...arguments_) => applyStyle(builder, arguments_.length === 1 ? "" + arguments_[0] : arguments_.join(" "));
      Object.setPrototypeOf(builder, proto);
      builder[GENERATOR] = self;
      builder[STYLER] = _styler;
      builder[IS_EMPTY] = _isEmpty;
      return builder;
    };
    applyStyle = (self, string) => {
      if (self.level <= 0 || !string) {
        return self[IS_EMPTY] ? "" : string;
      }
      let styler = self[STYLER];
      if (styler === void 0) {
        return string;
      }
      const { openAll, closeAll } = styler;
      if (string.includes("\x1B")) {
        while (styler !== void 0) {
          string = stringReplaceAll(string, styler.close, styler.open);
          styler = styler.parent;
        }
      }
      const lfIndex = string.indexOf("\n");
      if (lfIndex !== -1) {
        string = stringEncaseCRLFWithFirstIndex(string, closeAll, openAll, lfIndex);
      }
      return openAll + string + closeAll;
    };
    Object.defineProperties(createChalk.prototype, styles2);
    chalk = createChalk();
    chalkStderr = createChalk({ level: stderrColor ? stderrColor.level : 0 });
    source_default = chalk;
  }
});

// node_modules/ms/index.js
var require_ms = __commonJS({
  "node_modules/ms/index.js"(exports, module) {
    var s = 1e3;
    var m = s * 60;
    var h2 = m * 60;
    var d = h2 * 24;
    var w = d * 7;
    var y2 = d * 365.25;
    module.exports = function(val, options) {
      options = options || {};
      var type = typeof val;
      if (type === "string" && val.length > 0) {
        return parse(val);
      } else if (type === "number" && isFinite(val)) {
        return options.long ? fmtLong(val) : fmtShort(val);
      }
      throw new Error(
        "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
      );
    };
    function parse(str2) {
      str2 = String(str2);
      if (str2.length > 100) {
        return;
      }
      var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        str2
      );
      if (!match) {
        return;
      }
      var n = parseFloat(match[1]);
      var type = (match[2] || "ms").toLowerCase();
      switch (type) {
        case "years":
        case "year":
        case "yrs":
        case "yr":
        case "y":
          return n * y2;
        case "weeks":
        case "week":
        case "w":
          return n * w;
        case "days":
        case "day":
        case "d":
          return n * d;
        case "hours":
        case "hour":
        case "hrs":
        case "hr":
        case "h":
          return n * h2;
        case "minutes":
        case "minute":
        case "mins":
        case "min":
        case "m":
          return n * m;
        case "seconds":
        case "second":
        case "secs":
        case "sec":
        case "s":
          return n * s;
        case "milliseconds":
        case "millisecond":
        case "msecs":
        case "msec":
        case "ms":
          return n;
        default:
          return void 0;
      }
    }
    function fmtShort(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return Math.round(ms / d) + "d";
      }
      if (msAbs >= h2) {
        return Math.round(ms / h2) + "h";
      }
      if (msAbs >= m) {
        return Math.round(ms / m) + "m";
      }
      if (msAbs >= s) {
        return Math.round(ms / s) + "s";
      }
      return ms + "ms";
    }
    function fmtLong(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return plural(ms, msAbs, d, "day");
      }
      if (msAbs >= h2) {
        return plural(ms, msAbs, h2, "hour");
      }
      if (msAbs >= m) {
        return plural(ms, msAbs, m, "minute");
      }
      if (msAbs >= s) {
        return plural(ms, msAbs, s, "second");
      }
      return ms + " ms";
    }
    function plural(ms, msAbs, n, name) {
      var isPlural = msAbs >= n * 1.5;
      return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
    }
  }
});

// node_modules/debug/src/common.js
var require_common = __commonJS({
  "node_modules/debug/src/common.js"(exports, module) {
    function setup(env2) {
      createDebug.debug = createDebug;
      createDebug.default = createDebug;
      createDebug.coerce = coerce;
      createDebug.disable = disable;
      createDebug.enable = enable;
      createDebug.enabled = enabled;
      createDebug.humanize = require_ms();
      createDebug.destroy = destroy;
      Object.keys(env2).forEach((key) => {
        createDebug[key] = env2[key];
      });
      createDebug.names = [];
      createDebug.skips = [];
      createDebug.formatters = {};
      function selectColor(namespace) {
        let hash = 0;
        for (let i2 = 0; i2 < namespace.length; i2++) {
          hash = (hash << 5) - hash + namespace.charCodeAt(i2);
          hash |= 0;
        }
        return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
      }
      createDebug.selectColor = selectColor;
      function createDebug(namespace) {
        let prevTime;
        let enableOverride = null;
        let namespacesCache;
        let enabledCache;
        function debug2(...args) {
          if (!debug2.enabled) {
            return;
          }
          const self = debug2;
          const curr = Number(/* @__PURE__ */ new Date());
          const ms = curr - (prevTime || curr);
          self.diff = ms;
          self.prev = prevTime;
          self.curr = curr;
          prevTime = curr;
          args[0] = createDebug.coerce(args[0]);
          if (typeof args[0] !== "string") {
            args.unshift("%O");
          }
          let index = 0;
          args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
            if (match === "%%") {
              return "%";
            }
            index++;
            const formatter = createDebug.formatters[format];
            if (typeof formatter === "function") {
              const val = args[index];
              match = formatter.call(self, val);
              args.splice(index, 1);
              index--;
            }
            return match;
          });
          createDebug.formatArgs.call(self, args);
          const logFn = self.log || createDebug.log;
          logFn.apply(self, args);
        }
        debug2.namespace = namespace;
        debug2.useColors = createDebug.useColors();
        debug2.color = createDebug.selectColor(namespace);
        debug2.extend = extend;
        debug2.destroy = createDebug.destroy;
        Object.defineProperty(debug2, "enabled", {
          enumerable: true,
          configurable: false,
          get: () => {
            if (enableOverride !== null) {
              return enableOverride;
            }
            if (namespacesCache !== createDebug.namespaces) {
              namespacesCache = createDebug.namespaces;
              enabledCache = createDebug.enabled(namespace);
            }
            return enabledCache;
          },
          set: (v) => {
            enableOverride = v;
          }
        });
        if (typeof createDebug.init === "function") {
          createDebug.init(debug2);
        }
        return debug2;
      }
      function extend(namespace, delimiter) {
        const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
        newDebug.log = this.log;
        return newDebug;
      }
      function enable(namespaces) {
        createDebug.save(namespaces);
        createDebug.namespaces = namespaces;
        createDebug.names = [];
        createDebug.skips = [];
        const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
        for (const ns of split) {
          if (ns[0] === "-") {
            createDebug.skips.push(ns.slice(1));
          } else {
            createDebug.names.push(ns);
          }
        }
      }
      function matchesTemplate(search, template) {
        let searchIndex = 0;
        let templateIndex = 0;
        let starIndex = -1;
        let matchIndex = 0;
        while (searchIndex < search.length) {
          if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
            if (template[templateIndex] === "*") {
              starIndex = templateIndex;
              matchIndex = searchIndex;
              templateIndex++;
            } else {
              searchIndex++;
              templateIndex++;
            }
          } else if (starIndex !== -1) {
            templateIndex = starIndex + 1;
            matchIndex++;
            searchIndex = matchIndex;
          } else {
            return false;
          }
        }
        while (templateIndex < template.length && template[templateIndex] === "*") {
          templateIndex++;
        }
        return templateIndex === template.length;
      }
      function disable() {
        const namespaces = [
          ...createDebug.names,
          ...createDebug.skips.map((namespace) => "-" + namespace)
        ].join(",");
        createDebug.enable("");
        return namespaces;
      }
      function enabled(name) {
        for (const skip of createDebug.skips) {
          if (matchesTemplate(name, skip)) {
            return false;
          }
        }
        for (const ns of createDebug.names) {
          if (matchesTemplate(name, ns)) {
            return true;
          }
        }
        return false;
      }
      function coerce(val) {
        if (val instanceof Error) {
          return val.stack || val.message;
        }
        return val;
      }
      function destroy() {
        console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
      }
      createDebug.enable(createDebug.load());
      return createDebug;
    }
    module.exports = setup;
  }
});

// node_modules/debug/src/browser.js
var require_browser = __commonJS({
  "node_modules/debug/src/browser.js"(exports, module) {
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.storage = localstorage();
    exports.destroy = /* @__PURE__ */ (() => {
      let warned = false;
      return () => {
        if (!warned) {
          warned = true;
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
      };
    })();
    exports.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function useColors() {
      if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
        return true;
      }
      if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
        return false;
      }
      let m;
      return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function formatArgs(args) {
      args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
      if (!this.useColors) {
        return;
      }
      const c3 = "color: " + this.color;
      args.splice(1, 0, c3, "color: inherit");
      let index = 0;
      let lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === "%%") {
          return;
        }
        index++;
        if (match === "%c") {
          lastC = index;
        }
      });
      args.splice(lastC, 0, c3);
    }
    exports.log = console.debug || console.log || (() => {
    });
    function save(namespaces) {
      try {
        if (namespaces) {
          exports.storage.setItem("debug", namespaces);
        } else {
          exports.storage.removeItem("debug");
        }
      } catch (error) {
      }
    }
    function load() {
      let r2;
      try {
        r2 = exports.storage.getItem("debug") || exports.storage.getItem("DEBUG");
      } catch (error) {
      }
      if (!r2 && typeof process !== "undefined" && "env" in process) {
        r2 = process.env.DEBUG;
      }
      return r2;
    }
    function localstorage() {
      try {
        return localStorage;
      } catch (error) {
      }
    }
    module.exports = require_common()(exports);
    var { formatters } = module.exports;
    formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (error) {
        return "[UnexpectedJSONParseError]: " + error.message;
      }
    };
  }
});

// node_modules/debug/src/node.js
var require_node = __commonJS({
  "node_modules/debug/src/node.js"(exports, module) {
    var tty2 = __require("tty");
    var util = __require("util");
    exports.init = init;
    exports.log = log;
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.destroy = util.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    );
    exports.colors = [6, 2, 3, 4, 5, 1];
    try {
      const supportsColor2 = __require("supports-color");
      if (supportsColor2 && (supportsColor2.stderr || supportsColor2).level >= 2) {
        exports.colors = [
          20,
          21,
          26,
          27,
          32,
          33,
          38,
          39,
          40,
          41,
          42,
          43,
          44,
          45,
          56,
          57,
          62,
          63,
          68,
          69,
          74,
          75,
          76,
          77,
          78,
          79,
          80,
          81,
          92,
          93,
          98,
          99,
          112,
          113,
          128,
          129,
          134,
          135,
          148,
          149,
          160,
          161,
          162,
          163,
          164,
          165,
          166,
          167,
          168,
          169,
          170,
          171,
          172,
          173,
          178,
          179,
          184,
          185,
          196,
          197,
          198,
          199,
          200,
          201,
          202,
          203,
          204,
          205,
          206,
          207,
          208,
          209,
          214,
          215,
          220,
          221
        ];
      }
    } catch (error) {
    }
    exports.inspectOpts = Object.keys(process.env).filter((key) => {
      return /^debug_/i.test(key);
    }).reduce((obj, key) => {
      const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_2, k2) => {
        return k2.toUpperCase();
      });
      let val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) {
        val = true;
      } else if (/^(no|off|false|disabled)$/i.test(val)) {
        val = false;
      } else if (val === "null") {
        val = null;
      } else {
        val = Number(val);
      }
      obj[prop] = val;
      return obj;
    }, {});
    function useColors() {
      return "colors" in exports.inspectOpts ? Boolean(exports.inspectOpts.colors) : tty2.isatty(process.stderr.fd);
    }
    function formatArgs(args) {
      const { namespace: name, useColors: useColors2 } = this;
      if (useColors2) {
        const c3 = this.color;
        const colorCode = "\x1B[3" + (c3 < 8 ? c3 : "8;5;" + c3);
        const prefix = `  ${colorCode};1m${name} \x1B[0m`;
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
        args.push(colorCode + "m+" + module.exports.humanize(this.diff) + "\x1B[0m");
      } else {
        args[0] = getDate() + name + " " + args[0];
      }
    }
    function getDate() {
      if (exports.inspectOpts.hideDate) {
        return "";
      }
      return (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function log(...args) {
      return process.stderr.write(util.formatWithOptions(exports.inspectOpts, ...args) + "\n");
    }
    function save(namespaces) {
      if (namespaces) {
        process.env.DEBUG = namespaces;
      } else {
        delete process.env.DEBUG;
      }
    }
    function load() {
      return process.env.DEBUG;
    }
    function init(debug2) {
      debug2.inspectOpts = {};
      const keys = Object.keys(exports.inspectOpts);
      for (let i2 = 0; i2 < keys.length; i2++) {
        debug2.inspectOpts[keys[i2]] = exports.inspectOpts[keys[i2]];
      }
    }
    module.exports = require_common()(exports);
    var { formatters } = module.exports;
    formatters.o = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts).split("\n").map((str2) => str2.trim()).join(" ");
    };
    formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts);
    };
  }
});

// node_modules/debug/src/index.js
var require_src = __commonJS({
  "node_modules/debug/src/index.js"(exports, module) {
    if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
      module.exports = require_browser();
    } else {
      module.exports = require_node();
    }
  }
});

// node_modules/@kwsites/file-exists/dist/src/index.js
var require_src2 = __commonJS({
  "node_modules/@kwsites/file-exists/dist/src/index.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    var fs_1 = __require("fs");
    var debug_1 = __importDefault(require_src());
    var log = debug_1.default("@kwsites/file-exists");
    function check(path, isFile, isDirectory) {
      log(`checking %s`, path);
      try {
        const stat = fs_1.statSync(path);
        if (stat.isFile() && isFile) {
          log(`[OK] path represents a file`);
          return true;
        }
        if (stat.isDirectory() && isDirectory) {
          log(`[OK] path represents a directory`);
          return true;
        }
        log(`[FAIL] path represents something other than a file or directory`);
        return false;
      } catch (e) {
        if (e.code === "ENOENT") {
          log(`[FAIL] path is not accessible: %o`, e);
          return false;
        }
        log(`[FATAL] %o`, e);
        throw e;
      }
    }
    function exists2(path, type = exports.READABLE) {
      return check(path, (type & exports.FILE) > 0, (type & exports.FOLDER) > 0);
    }
    exports.exists = exists2;
    exports.FILE = 1;
    exports.FOLDER = 2;
    exports.READABLE = exports.FILE + exports.FOLDER;
  }
});

// node_modules/@kwsites/file-exists/dist/index.js
var require_dist = __commonJS({
  "node_modules/@kwsites/file-exists/dist/index.js"(exports) {
    "use strict";
    function __export3(m) {
      for (var p2 in m) if (!exports.hasOwnProperty(p2)) exports[p2] = m[p2];
    }
    Object.defineProperty(exports, "__esModule", { value: true });
    __export3(require_src2());
  }
});

// node_modules/@simple-git/args-pathspec/dist/index.mjs
function c(...n) {
  const e = new String(n);
  return t.set(e, n), e;
}
function r(n) {
  return n instanceof String && t.has(n);
}
function o(n) {
  return t.get(n) ?? [];
}
var t;
var init_dist = __esm({
  "node_modules/@simple-git/args-pathspec/dist/index.mjs"() {
    t = /* @__PURE__ */ new WeakMap();
  }
});

// node_modules/@kwsites/promise-deferred/dist/index.js
var require_dist2 = __commonJS({
  "node_modules/@kwsites/promise-deferred/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createDeferred = exports.deferred = void 0;
    function deferred2() {
      let done;
      let fail;
      let status = "pending";
      const promise = new Promise((_done, _fail) => {
        done = _done;
        fail = _fail;
      });
      return {
        promise,
        done(result) {
          if (status === "pending") {
            status = "resolved";
            done(result);
          }
        },
        fail(error) {
          if (status === "pending") {
            status = "rejected";
            fail(error);
          }
        },
        get fulfilled() {
          return status !== "pending";
        },
        get status() {
          return status;
        }
      };
    }
    exports.deferred = deferred2;
    exports.createDeferred = deferred2;
    exports.default = deferred2;
  }
});

// node_modules/@simple-git/argv-parser/dist/index.mjs
function* U(e, t2) {
  const n = t2 === "global";
  for (const o2 of e)
    o2.isGlobal === n && (yield o2);
}
function F(e, t2) {
  for (const { name: o2 } of U(e, "task")) {
    if (k.has(o2))
      return p(true, t2);
    if (S.has(o2))
      return p(false, t2);
  }
  const n = t2.at(0)?.toLowerCase();
  return n === void 0 ? null : P.has(n) ? p(true, t2.slice(1)) : E.has(n) ? p(false, t2.slice(1)) : t2.length === 1 ? p(false, t2) : p(true, t2);
}
function p(e = false, t2 = []) {
  const n = t2.at(0)?.toLowerCase();
  return n === void 0 ? null : {
    isWrite: e,
    isRead: !e,
    key: n,
    value: t2.at(1)
  };
}
function A(e, t2) {
  return t2.isWrite && t2.value !== void 0 ? { key: t2.key, value: t2.value, scope: e } : { key: t2.key, scope: e };
}
function M(e) {
  const t2 = e?.indexOf("=") || -1;
  return !e || t2 < 0 ? null : {
    key: e.slice(0, t2).trim().toLowerCase(),
    value: e.slice(t2 + 1)
  };
}
function N(e) {
  for (const { name: t2 } of U(e, "task"))
    switch (t2) {
      case "--global":
        return "global";
      case "--system":
        return "system";
      case "--worktree":
        return "worktree";
      case "--local":
        return "local";
      case "--file":
      case "-f":
        return "file";
    }
  return "local";
}
function G({ name: e }) {
  if (e === "-c" || e === "--config")
    return "inline";
  if (e === "--config-env")
    return "env";
}
function* O(e) {
  for (const t2 of e) {
    const n = G(t2), o2 = n && M(t2.value);
    o2 && (yield {
      ...o2,
      scope: n
    });
  }
}
function L(e, t2, n) {
  const o2 = {
    read: [],
    write: [...O(t2)]
  };
  return e === "config" && $(
    o2,
    N(t2),
    F(t2, n)
  ), o2;
}
function $(e, t2, n) {
  if (n === null)
    return;
  const o2 = A(t2, n);
  n.isWrite ? e.write.push(o2) : e.read.push(o2);
}
function I(e) {
  const t2 = R[e ?? ""] ?? T;
  return {
    short: new Map([...x.short.entries(), ...t2.short.entries()]),
    long: t2.long
  };
}
function b(e, t2 = D) {
  if (e.startsWith("--")) {
    const n = e.indexOf("=");
    if (n > 2)
      return [{ name: e.slice(0, n), value: e.slice(n + 1), needsNext: false }];
    const o2 = e.slice(2);
    return [{ name: e, needsNext: t2.long.has(o2) }];
  }
  if (e.length === 2) {
    const n = e.charAt(1), o2 = t2.short.get(n);
    return [{ name: e, needsNext: o2 === true }];
  }
  return W(e, t2.short);
}
function W(e, t2) {
  const n = e.slice(1).split(""), o2 = [];
  for (let s = 0; s < n.length; s++) {
    const r2 = n[s], l = t2.get(r2);
    if (l === void 0)
      return [{ name: e, needsNext: false }];
    if (l) {
      const a = n.slice(s + 1).join("");
      if (a && ![...a].every((w) => t2.has(w)))
        return o2.push({ name: `-${r2}`, value: a, needsNext: false }), o2;
    }
    o2.push({ name: `-${r2}`, needsNext: l });
  }
  return o2;
}
function j(e, t2 = []) {
  let n = 0;
  for (; n < e.length; ) {
    const o2 = String(e[n]);
    if (!o2.startsWith("-") || o2.length < 2) break;
    const s = b(o2);
    let r2 = n + 1;
    for (const l of s) {
      const a = {
        name: l.name,
        value: l.value,
        absorbedNext: false,
        isGlobal: true
      };
      l.needsNext && a.value === void 0 && r2 < e.length && (a.value = String(e[r2]), a.absorbedNext = true, r2++), t2.push(a);
    }
    n = r2;
  }
  return { flags: t2, taskIndex: n };
}
function B(e, t2, n = []) {
  const o2 = I(t2), s = [], r2 = [];
  let l = 0;
  for (; l < e.length; ) {
    const a = e[l];
    if (r(a)) {
      r2.push(...o(a)), l++;
      continue;
    }
    const f = String(a);
    if (f === "--") {
      for (let g = l + 1; g < e.length; g++) {
        const u = e[g];
        r(u) ? r2.push(...o(u)) : r2.push(String(u));
      }
      break;
    }
    if (!f.startsWith("-") || f.length < 2) {
      s.push(f), l++;
      continue;
    }
    const w = b(f, o2);
    let d = l + 1;
    for (const g of w) {
      const u = {
        name: g.name,
        value: g.value,
        absorbedNext: false,
        isGlobal: false
      };
      g.needsNext && u.value === void 0 && d < e.length && !r(e[d]) && (u.value = String(e[d]), u.absorbedNext = true, d++), n.push(u);
    }
    l = d;
  }
  return { flags: n, positionals: s, pathspecs: r2 };
}
function* V({
  write: e
}) {
  for (const t2 of e)
    for (const n of q) {
      const o2 = n(t2.key);
      o2 && (yield o2);
    }
}
function c2(e, t2, n = String(e)) {
  const o2 = typeof e == "string" ? new RegExp(`\\s*${e.toLowerCase()}`) : e;
  return function(r2) {
    if (o2.test(r2))
      return {
        category: t2,
        message: `Configuring ${n} is not permitted without enabling ${t2}`
      };
  };
}
function i(e, t2) {
  const n = new RegExp(`\\s*${e.toLowerCase().replace(/\./g, "(..+)?.")}`);
  return c2(n, t2, e);
}
function* K(e, t2) {
  for (const n of t2)
    for (const o2 of H) {
      const s = o2(e, n.name);
      s && (yield s);
    }
}
function h(e, t2, n, o2 = String(t2)) {
  const s = typeof t2 == "string" ? new RegExp(`\\s*${t2.toLowerCase()}`) : t2, r2 = `Use of ${e ? `${e} with option ` : ""}${o2} is not permitted without enabling ${n}`;
  return function(a, f) {
    if ((!e || a === e) && s.test(f))
      return {
        category: n,
        message: r2
      };
  };
}
function C(e, t2, n) {
  return [...K(e, t2), ...V(n)];
}
function Y(...e) {
  const { flags: t2, taskIndex: n } = j(e), o2 = n < e.length ? String(e[n]).toLowerCase() : null, s = o2 !== null ? e.slice(n + 1) : [], { positionals: r2, pathspecs: l } = B(s, o2, t2), a = L(o2, t2, r2);
  return {
    task: o2,
    flags: t2.map(J),
    paths: l,
    config: a,
    vulnerabilities: z(C(o2, t2, a))
  };
}
function z(e) {
  return Object.defineProperty(e, "vulnerabilities", {
    value: e
  });
}
function J({ value: e, name: t2 }) {
  return e !== void 0 ? { name: t2, value: e } : { name: t2 };
}
function* Q(e) {
  const t2 = parseInt(e.git_config_count ?? "0", 10);
  for (let n = 0; n < t2; n++) {
    const o2 = e[`git_config_key_${n}`], s = e[`git_config_value_${n}`];
    o2 !== void 0 && (yield { key: o2.toLowerCase().trim(), value: s, scope: "env" });
  }
}
function* X(e) {
  for (const t2 of Object.keys(e))
    if (_(t2)) {
      const n = y[t2];
      yield {
        category: n,
        message: `Use of "${t2.toUpperCase()}" is not permitted without enabling ${n}`
      };
    }
}
function _(e) {
  return Object.hasOwn(y, e);
}
function Z(e) {
  const t2 = {};
  for (const [n, o2] of Object.entries(e)) {
    const s = n.toLowerCase().trim();
    (_(s) || s.startsWith("git")) && (t2[s] = String(o2));
  }
  return t2;
}
function ee(e) {
  const t2 = Z(e), n = {
    read: [],
    write: [...Q(t2)]
  }, o2 = [
    ...X(t2),
    ...C(null, [], n)
  ];
  return {
    config: n,
    vulnerabilities: o2
  };
}
function ne(e, t2) {
  return [...Y(...e).vulnerabilities, ...ee(t2).vulnerabilities];
}
var k, S, P, E, x, D, R, T, q, H, y;
var init_dist2 = __esm({
  "node_modules/@simple-git/argv-parser/dist/index.mjs"() {
    init_dist();
    k = /* @__PURE__ */ new Set([
      "--add",
      "--edit",
      "--remove-section",
      "--rename-section",
      "--replace-all",
      "--unset",
      "--unset-all",
      "-e"
    ]);
    S = /* @__PURE__ */ new Set([
      "--get",
      "--get-all",
      "--get-color",
      "--get-colorbool",
      "--get-regexp",
      "--get-urlmatch",
      "--list",
      "-l"
    ]);
    P = /* @__PURE__ */ new Set([
      "edit",
      "remove-section",
      "rename-section",
      "set",
      "unset"
    ]);
    E = /* @__PURE__ */ new Set(["get", "get-color", "get-colorbool", "list"]);
    x = {
      short: /* @__PURE__ */ new Map([
        ["c", true]
        //  -c <k=v>    set config key for this invocation
      ])
    };
    D = {
      short: new Map([
        ["C", true],
        //  -C <path>   change working directory
        ["P", false],
        // -P          no pager (alias for --no-pager)
        ["h", false],
        // -h          help
        ["p", false],
        // -p          paginate
        ["v", false],
        // -v          version
        ...x.short.entries()
      ]),
      long: /* @__PURE__ */ new Set([
        "attr-source",
        "config-env",
        "exec-path",
        "git-dir",
        "list-cmds",
        "namespace",
        "super-prefix",
        "work-tree"
      ])
    };
    R = {
      clone: {
        short: /* @__PURE__ */ new Map([
          ["b", true],
          // -b <branch>
          ["j", true],
          // -j <n>          parallel jobs
          ["l", false],
          // -l local
          ["n", false],
          // -n no-checkout
          ["o", true],
          // -o <name>       remote name
          ["q", false],
          // -q quiet
          ["s", false],
          // -s shared
          ["u", true]
          // -u <upload-pack>
        ]),
        long: /* @__PURE__ */ new Set(["branch", "config", "jobs", "origin", "upload-pack", "u", "template"])
      },
      commit: {
        short: /* @__PURE__ */ new Map([
          ["C", true],
          // -C <commit>  reuse message
          ["F", true],
          // -F <file>    read message from file
          ["c", true],
          // -c <commit>  reedit message
          ["m", true],
          // -m <msg>
          ["t", true]
          // -t <template>
        ]),
        long: /* @__PURE__ */ new Set(["file", "message", "reedit-message", "reuse-message", "template"])
      },
      config: {
        short: /* @__PURE__ */ new Map([
          ["e", false],
          // -e  open editor
          ["f", true],
          //  -f <file>
          ["l", false]
          // -l  list
        ]),
        long: /* @__PURE__ */ new Set(["blob", "comment", "default", "file", "type", "value"])
      },
      fetch: {
        short: /* @__PURE__ */ new Map(),
        long: /* @__PURE__ */ new Set(["upload-pack"])
      },
      init: {
        short: /* @__PURE__ */ new Map(),
        long: /* @__PURE__ */ new Set(["template"])
      },
      pull: {
        short: /* @__PURE__ */ new Map(),
        long: /* @__PURE__ */ new Set(["upload-pack"])
      },
      push: {
        short: /* @__PURE__ */ new Map(),
        long: /* @__PURE__ */ new Set(["exec", "receive-pack"])
      }
    };
    T = { short: /* @__PURE__ */ new Map(), long: /* @__PURE__ */ new Set() };
    q = [
      c2("alias", "allowUnsafeAlias"),
      c2("core.askPass", "allowUnsafeAskPass"),
      c2("core.editor", "allowUnsafeEditor"),
      c2("core.fsmonitor", "allowUnsafeFsMonitor"),
      c2("core.gitProxy", "allowUnsafeGitProxy"),
      c2("core.hooksPath", "allowUnsafeHooksPath"),
      c2("core.pager", "allowUnsafePager"),
      c2("core.sshCommand", "allowUnsafeSshCommand"),
      i("credential.helper", "allowUnsafeCredentialHelper"),
      i("diff.command", "allowUnsafeDiffExternal"),
      c2("diff.external", "allowUnsafeDiffExternal"),
      i("diff.textconv", "allowUnsafeDiffTextConv"),
      i("filter.clean", "allowUnsafeFilter"),
      i("filter.smudge", "allowUnsafeFilter"),
      i("gpg.program", "allowUnsafeGpgProgram"),
      c2("init.templateDir", "allowUnsafeTemplateDir"),
      i("merge.driver", "allowUnsafeMergeDriver"),
      i("mergetool.path", "allowUnsafeMergeDriver"),
      i("mergetool.cmd", "allowUnsafeMergeDriver"),
      i("protocol.allow", "allowUnsafeProtocolOverride"),
      i("remote.receivepack", "allowUnsafePack"),
      i("remote.uploadpack", "allowUnsafePack"),
      c2("sequence.editor", "allowUnsafeEditor")
    ];
    H = [
      h(
        null,
        /--(upload|receive)-pack/,
        "allowUnsafePack",
        "--upload-pack or --receive-pack"
      ),
      h("clone", /^-\w*u/, "allowUnsafePack"),
      h("clone", "--u", "allowUnsafePack"),
      h("push", "--exec", "allowUnsafePack"),
      h(null, "--template", "allowUnsafeTemplateDir")
    ];
    y = {
      editor: "allowUnsafeEditor",
      git_askpass: "allowUnsafeAskPass",
      git_config_global: "allowUnsafeConfigPaths",
      git_config_system: "allowUnsafeConfigPaths",
      git_config_count: "allowUnsafeConfigEnvCount",
      git_config: "allowUnsafeConfigPaths",
      git_editor: "allowUnsafeEditor",
      git_exec_path: "allowUnsafeConfigPaths",
      git_external_diff: "allowUnsafeDiffExternal",
      git_pager: "allowUnsafePager",
      git_proxy_command: "allowUnsafeGitProxy",
      git_template_dir: "allowUnsafeTemplateDir",
      git_sequence_editor: "allowUnsafeEditor",
      git_ssh: "allowUnsafeSshCommand",
      git_ssh_command: "allowUnsafeSshCommand",
      pager: "allowUnsafePager",
      prefix: "allowUnsafeConfigPaths",
      ssh_askpass: "allowUnsafeAskPass"
    };
  }
});

// node_modules/simple-git/dist/esm/index.js
import { spawn } from "child_process";
import { normalize } from "node:path";
import { EventEmitter } from "node:events";
function asFunction(source) {
  if (typeof source !== "function") {
    return NOOP;
  }
  return source;
}
function isUserFunction(source) {
  return typeof source === "function" && source !== NOOP;
}
function splitOn(input, char) {
  const index = input.indexOf(char);
  if (index <= 0) {
    return [input, ""];
  }
  return [input.substr(0, index), input.substr(index + 1)];
}
function first(input, offset = 0) {
  return isArrayLike(input) && input.length > offset ? input[offset] : void 0;
}
function last(input, offset = 0) {
  if (isArrayLike(input) && input.length > offset) {
    return input[input.length - 1 - offset];
  }
}
function isArrayLike(input) {
  return filterHasLength(input);
}
function toLinesWithContent(input = "", trimmed2 = true, separator = "\n") {
  return input.split(separator).reduce((output, line) => {
    const lineContent = trimmed2 ? line.trim() : line;
    if (lineContent) {
      output.push(lineContent);
    }
    return output;
  }, []);
}
function forEachLineWithContent(input, callback) {
  return toLinesWithContent(input, true).map((line) => callback(line));
}
function folderExists(path) {
  return (0, import_file_exists.exists)(path, import_file_exists.FOLDER);
}
function append(target, item) {
  if (Array.isArray(target)) {
    if (!target.includes(item)) {
      target.push(item);
    }
  } else {
    target.add(item);
  }
  return item;
}
function including(target, item) {
  if (Array.isArray(target) && !target.includes(item)) {
    target.push(item);
  }
  return target;
}
function remove(target, item) {
  if (Array.isArray(target)) {
    const index = target.indexOf(item);
    if (index >= 0) {
      target.splice(index, 1);
    }
  } else {
    target.delete(item);
  }
  return item;
}
function asArray(source) {
  return Array.isArray(source) ? source : [source];
}
function asCamelCase(str2) {
  return str2.replace(/[\s-]+(.)/g, (_all, chr) => {
    return chr.toUpperCase();
  });
}
function asStringArray(source) {
  return asArray(source).map((item) => {
    return item instanceof String ? item : String(item);
  });
}
function asNumber(source, onNaN = 0) {
  if (source == null) {
    return onNaN;
  }
  const num = parseInt(source, 10);
  return Number.isNaN(num) ? onNaN : num;
}
function prefixedArray(input, prefix) {
  const output = [];
  for (let i2 = 0, max = input.length; i2 < max; i2++) {
    output.push(prefix, input[i2]);
  }
  return output;
}
function bufferToString(input) {
  return (Array.isArray(input) ? Buffer.concat(input) : input).toString("utf-8");
}
function pick(source, properties) {
  const out = {};
  properties.forEach((key) => {
    if (source[key] !== void 0) {
      out[key] = source[key];
    }
  });
  return out;
}
function delay(duration = 0) {
  return new Promise((done) => setTimeout(done, duration));
}
function orVoid(input) {
  if (input === false) {
    return void 0;
  }
  return input;
}
function filterType(input, filter, def) {
  if (filter(input)) {
    return input;
  }
  return arguments.length > 2 ? def : void 0;
}
function filterPrimitives(input, omit) {
  const type = r(input) ? "string" : typeof input;
  return /number|string|boolean/.test(type) && (!omit || !omit.includes(type));
}
function filterPlainObject(input) {
  return !!input && objectToString(input) === "[object Object]";
}
function filterFunction(input) {
  return typeof input === "function";
}
function useMatchesDefault() {
  throw new Error(`LineParser:useMatches not implemented`);
}
function createInstanceConfig(...options) {
  const baseDir = process.cwd();
  const config = Object.assign(
    { baseDir, ...defaultOptions },
    ...options.filter((o2) => typeof o2 === "object" && o2)
  );
  config.baseDir = config.baseDir || baseDir;
  config.trimmed = config.trimmed === true;
  return config;
}
function appendTaskOptions(options, commands = []) {
  if (!filterPlainObject(options)) {
    return commands;
  }
  return Object.keys(options).reduce((commands2, key) => {
    const value = options[key];
    if (r(value)) {
      commands2.push(value);
    } else if (filterPrimitives(value, ["boolean"])) {
      commands2.push(key + "=" + value);
    } else if (Array.isArray(value)) {
      for (const v of value) {
        if (!filterPrimitives(v, ["string", "number"])) {
          commands2.push(key + "=" + v);
        }
      }
    } else {
      commands2.push(key);
    }
    return commands2;
  }, commands);
}
function getTrailingOptions(args, initialPrimitive = 0, objectOnly = false) {
  const command = [];
  for (let i2 = 0, max = initialPrimitive < 0 ? args.length : initialPrimitive; i2 < max; i2++) {
    if ("string|number".includes(typeof args[i2])) {
      command.push(String(args[i2]));
    }
  }
  appendTaskOptions(trailingOptionsArgument(args), command);
  if (!objectOnly) {
    command.push(...trailingArrayArgument(args));
  }
  return command;
}
function trailingArrayArgument(args) {
  const hasTrailingCallback = typeof last(args) === "function";
  return asStringArray(filterType(last(args, hasTrailingCallback ? 1 : 0), filterArray, []));
}
function trailingOptionsArgument(args) {
  const hasTrailingCallback = filterFunction(last(args));
  return filterType(last(args, hasTrailingCallback ? 1 : 0), filterPlainObject);
}
function trailingFunctionArgument(args, includeNoop = true) {
  const callback = asFunction(last(args));
  return includeNoop || isUserFunction(callback) ? callback : void 0;
}
function callTaskParser(parser4, streams) {
  return parser4(streams.stdOut, streams.stdErr);
}
function parseStringResponse(result, parsers12, texts, trim = true) {
  asArray(texts).forEach((text) => {
    for (let lines = toLinesWithContent(text, trim), i2 = 0, max = lines.length; i2 < max; i2++) {
      const line = (offset = 0) => {
        if (i2 + offset >= max) {
          return;
        }
        return lines[i2 + offset];
      };
      parsers12.some(({ parse }) => parse(line, result));
    }
  });
  return result;
}
function checkIsRepoTask(action) {
  switch (action) {
    case "bare":
      return checkIsBareRepoTask();
    case "root":
      return checkIsRepoRootTask();
  }
  const commands = ["rev-parse", "--is-inside-work-tree"];
  return {
    commands,
    format: "utf-8",
    onError,
    parser
  };
}
function checkIsRepoRootTask() {
  const commands = ["rev-parse", "--git-dir"];
  return {
    commands,
    format: "utf-8",
    onError,
    parser(path) {
      return /^\.(git)?$/.test(path.trim());
    }
  };
}
function checkIsBareRepoTask() {
  const commands = ["rev-parse", "--is-bare-repository"];
  return {
    commands,
    format: "utf-8",
    onError,
    parser
  };
}
function isNotRepoMessage(error) {
  return /(Not a git repository|Kein Git-Repository)/i.test(String(error));
}
function cleanSummaryParser(dryRun, text) {
  const summary = new CleanResponse(dryRun);
  const regexp = dryRun ? dryRunRemovalRegexp : removalRegexp;
  toLinesWithContent(text).forEach((line) => {
    const removed = line.replace(regexp, "");
    summary.paths.push(removed);
    (isFolderRegexp.test(removed) ? summary.folders : summary.files).push(removed);
  });
  return summary;
}
function adhocExecTask(parser4) {
  return {
    commands: EMPTY_COMMANDS,
    format: "empty",
    parser: parser4
  };
}
function configurationErrorTask(error) {
  return {
    commands: EMPTY_COMMANDS,
    format: "empty",
    parser() {
      throw typeof error === "string" ? new TaskConfigurationError(error) : error;
    }
  };
}
function straightThroughStringTask(commands, trimmed2 = false) {
  return {
    commands,
    format: "utf-8",
    parser(text) {
      return trimmed2 ? String(text).trim() : text;
    }
  };
}
function straightThroughBufferTask(commands) {
  return {
    commands,
    format: "buffer",
    parser(buffer) {
      return buffer;
    }
  };
}
function isBufferTask(task) {
  return task.format === "buffer";
}
function isEmptyTask(task) {
  return task.format === "empty" || !task.commands.length;
}
function cleanWithOptionsTask(mode, customArgs) {
  const { cleanMode, options, valid } = getCleanOptions(mode);
  if (!cleanMode) {
    return configurationErrorTask(CONFIG_ERROR_MODE_REQUIRED);
  }
  if (!valid.options) {
    return configurationErrorTask(CONFIG_ERROR_UNKNOWN_OPTION + JSON.stringify(mode));
  }
  options.push(...customArgs);
  if (options.some(isInteractiveMode)) {
    return configurationErrorTask(CONFIG_ERROR_INTERACTIVE_MODE);
  }
  return cleanTask(cleanMode, options);
}
function cleanTask(mode, customArgs) {
  const commands = ["clean", `-${mode}`, ...customArgs];
  return {
    commands,
    format: "utf-8",
    parser(text) {
      return cleanSummaryParser(mode === "n", text);
    }
  };
}
function isCleanOptionsArray(input) {
  return Array.isArray(input) && input.every((test) => CleanOptionValues.has(test));
}
function getCleanOptions(input) {
  let cleanMode;
  let options = [];
  let valid = { cleanMode: false, options: true };
  input.replace(/[^a-z]i/g, "").split("").forEach((char) => {
    if (isCleanMode(char)) {
      cleanMode = char;
      valid.cleanMode = true;
    } else {
      valid.options = valid.options && isKnownOption(options[options.length] = `-${char}`);
    }
  });
  return {
    cleanMode,
    options,
    valid
  };
}
function isCleanMode(cleanMode) {
  return cleanMode === "f" || cleanMode === "n";
}
function isKnownOption(option) {
  return /^-[a-z]$/i.test(option) && CleanOptionValues.has(option.charAt(1));
}
function isInteractiveMode(option) {
  if (/^-[^\-]/.test(option)) {
    return option.indexOf("i") > 0;
  }
  return option === "--interactive";
}
function configListParser(text) {
  const config = new ConfigList();
  for (const item of configParser(text)) {
    config.addValue(item.file, String(item.key), item.value);
  }
  return config;
}
function configGetParser(text, key) {
  let value = null;
  const values = [];
  const scopes = /* @__PURE__ */ new Map();
  for (const item of configParser(text, key)) {
    if (item.key !== key) {
      continue;
    }
    values.push(value = item.value);
    if (!scopes.has(item.file)) {
      scopes.set(item.file, []);
    }
    scopes.get(item.file).push(value);
  }
  return {
    key,
    paths: Array.from(scopes.keys()),
    scopes,
    value,
    values
  };
}
function configFilePath(filePath) {
  return filePath.replace(/^(file):/, "");
}
function* configParser(text, requestedKey = null) {
  const lines = text.split("\0");
  for (let i2 = 0, max = lines.length - 1; i2 < max; ) {
    const file = configFilePath(lines[i2++]);
    let value = lines[i2++];
    let key = requestedKey;
    if (value.includes("\n")) {
      const line = splitOn(value, "\n");
      key = line[0];
      value = line[1];
    }
    yield { file, key, value };
  }
}
function asConfigScope(scope, fallback) {
  if (typeof scope === "string" && Object.hasOwn(GitConfigScope, scope)) {
    return scope;
  }
  return fallback;
}
function addConfigTask(key, value, append2, scope) {
  const commands = ["config", `--${scope}`];
  if (append2) {
    commands.push("--add");
  }
  commands.push(key, value);
  return {
    commands,
    format: "utf-8",
    parser(text) {
      return text;
    }
  };
}
function getConfigTask(key, scope) {
  const commands = ["config", "--null", "--show-origin", "--get-all", key];
  if (scope) {
    commands.splice(1, 0, `--${scope}`);
  }
  return {
    commands,
    format: "utf-8",
    parser(text) {
      return configGetParser(text, key);
    }
  };
}
function listConfigTask(scope) {
  const commands = ["config", "--list", "--show-origin", "--null"];
  if (scope) {
    commands.push(`--${scope}`);
  }
  return {
    commands,
    format: "utf-8",
    parser(text) {
      return configListParser(text);
    }
  };
}
function config_default() {
  return {
    addConfig(key, value, ...rest) {
      return this._runTask(
        addConfigTask(
          key,
          value,
          rest[0] === true,
          asConfigScope(
            rest[1],
            "local"
            /* local */
          )
        ),
        trailingFunctionArgument(arguments)
      );
    },
    getConfig(key, scope) {
      return this._runTask(
        getConfigTask(key, asConfigScope(scope, void 0)),
        trailingFunctionArgument(arguments)
      );
    },
    listConfig(...rest) {
      return this._runTask(
        listConfigTask(asConfigScope(rest[0], void 0)),
        trailingFunctionArgument(arguments)
      );
    }
  };
}
function isDiffNameStatus(input) {
  return diffNameStatus.has(input);
}
function grepQueryBuilder(...params) {
  return new GrepQuery().param(...params);
}
function parseGrep(grep) {
  const paths = /* @__PURE__ */ new Set();
  const results = {};
  forEachLineWithContent(grep, (input) => {
    const [path, line, preview] = input.split(NULL);
    paths.add(path);
    (results[path] = results[path] || []).push({
      line: asNumber(line),
      path,
      preview
    });
  });
  return {
    paths,
    results
  };
}
function grep_default() {
  return {
    grep(searchTerm) {
      const then = trailingFunctionArgument(arguments);
      const options = getTrailingOptions(arguments);
      for (const option of disallowedOptions) {
        if (options.includes(option)) {
          return this._runTask(
            configurationErrorTask(`git.grep: use of "${option}" is not supported.`),
            then
          );
        }
      }
      if (typeof searchTerm === "string") {
        searchTerm = grepQueryBuilder().param(searchTerm);
      }
      const commands = ["grep", "--null", "-n", "--full-name", ...options, ...searchTerm];
      return this._runTask(
        {
          commands,
          format: "utf-8",
          parser(stdOut) {
            return parseGrep(stdOut);
          }
        },
        then
      );
    }
  };
}
function resetTask(mode, customArgs) {
  const commands = ["reset"];
  if (isValidResetMode(mode)) {
    commands.push(`--${mode}`);
  }
  commands.push(...customArgs);
  return straightThroughStringTask(commands);
}
function getResetMode(mode) {
  if (isValidResetMode(mode)) {
    return mode;
  }
  switch (typeof mode) {
    case "string":
    case "undefined":
      return "soft";
  }
  return;
}
function isValidResetMode(mode) {
  return typeof mode === "string" && validResetModes.includes(mode);
}
function createLog() {
  return (0, import_debug.default)("simple-git");
}
function prefixedLogger(to, prefix, forward) {
  if (!prefix || !String(prefix).replace(/\s*/, "")) {
    return !forward ? to : (message, ...args) => {
      to(message, ...args);
      forward(message, ...args);
    };
  }
  return (message, ...args) => {
    to(`%s ${message}`, prefix, ...args);
    if (forward) {
      forward(message, ...args);
    }
  };
}
function childLoggerName(name, childDebugger, { namespace: parentNamespace }) {
  if (typeof name === "string") {
    return name;
  }
  const childNamespace = childDebugger && childDebugger.namespace || "";
  if (childNamespace.startsWith(parentNamespace)) {
    return childNamespace.substr(parentNamespace.length + 1);
  }
  return childNamespace || parentNamespace;
}
function createLogger(label, verbose, initialStep, infoDebugger = createLog()) {
  const labelPrefix = label && `[${label}]` || "";
  const spawned = [];
  const debugDebugger = typeof verbose === "string" ? infoDebugger.extend(verbose) : verbose;
  const key = childLoggerName(filterType(verbose, filterString), debugDebugger, infoDebugger);
  return step(initialStep);
  function sibling(name, initial) {
    return append(
      spawned,
      createLogger(label, key.replace(/^[^:]+/, name), initial, infoDebugger)
    );
  }
  function step(phase) {
    const stepPrefix = phase && `[${phase}]` || "";
    const debug2 = debugDebugger && prefixedLogger(debugDebugger, stepPrefix) || NOOP;
    const info = prefixedLogger(infoDebugger, `${labelPrefix} ${stepPrefix}`, debug2);
    return Object.assign(debugDebugger ? debug2 : info, {
      label,
      sibling,
      info,
      step
    });
  }
}
function pluginContext(task, commands) {
  return {
    method: first(task.commands) || "",
    commands
  };
}
function onErrorReceived(target, logger) {
  return (err) => {
    logger(`[ERROR] child process exception %o`, err);
    target.push(Buffer.from(String(err.stack), "ascii"));
  };
}
function onDataReceived(target, name, logger, output) {
  return (buffer) => {
    logger(`%s received %L bytes`, name, buffer);
    output(`%B`, buffer);
    target.push(buffer);
  };
}
function taskCallback(task, response, callback = NOOP) {
  const onSuccess = (data) => {
    callback(null, data);
  };
  const onError2 = (err) => {
    if (err?.task === task) {
      callback(
        err instanceof GitResponseError ? addDeprecationNoticeToError(err) : err,
        void 0
      );
    }
  };
  response.then(onSuccess, onError2);
}
function addDeprecationNoticeToError(err) {
  let log = (name) => {
    console.warn(
      `simple-git deprecation notice: accessing GitResponseError.${name} should be GitResponseError.git.${name}, this will no longer be available in version 3`
    );
    log = NOOP;
  };
  return Object.create(err, Object.getOwnPropertyNames(err.git).reduce(descriptorReducer, {}));
  function descriptorReducer(all, name) {
    if (name in err) {
      return all;
    }
    all[name] = {
      enumerable: false,
      configurable: false,
      get() {
        log(name);
        return err.git[name];
      }
    };
    return all;
  }
}
function changeWorkingDirectoryTask(directory, root) {
  return adhocExecTask((instance) => {
    if (!folderExists(directory)) {
      throw new Error(`Git.cwd: cannot change to non-directory "${directory}"`);
    }
    return (root || instance).cwd = directory;
  });
}
function checkoutTask(args) {
  const commands = ["checkout", ...args];
  if (commands[1] === "-b" && commands.includes("-B")) {
    commands[1] = remove(commands, "-B");
  }
  return straightThroughStringTask(commands);
}
function checkout_default() {
  return {
    checkout() {
      return this._runTask(
        checkoutTask(getTrailingOptions(arguments, 1)),
        trailingFunctionArgument(arguments)
      );
    },
    checkoutBranch(branchName, startPoint) {
      return this._runTask(
        checkoutTask(["-b", branchName, startPoint, ...getTrailingOptions(arguments)]),
        trailingFunctionArgument(arguments)
      );
    },
    checkoutLocalBranch(branchName) {
      return this._runTask(
        checkoutTask(["-b", branchName, ...getTrailingOptions(arguments)]),
        trailingFunctionArgument(arguments)
      );
    }
  };
}
function countObjectsResponse() {
  return {
    count: 0,
    garbage: 0,
    inPack: 0,
    packs: 0,
    prunePackable: 0,
    size: 0,
    sizeGarbage: 0,
    sizePack: 0
  };
}
function count_objects_default() {
  return {
    countObjects() {
      return this._runTask({
        commands: ["count-objects", "--verbose"],
        format: "utf-8",
        parser(stdOut) {
          return parseStringResponse(countObjectsResponse(), [parser2], stdOut);
        }
      });
    }
  };
}
function parseCommitResult(stdOut) {
  const result = {
    author: null,
    branch: "",
    commit: "",
    root: false,
    summary: {
      changes: 0,
      insertions: 0,
      deletions: 0
    }
  };
  return parseStringResponse(result, parsers, stdOut);
}
function commitTask(message, files, customArgs) {
  const commands = [
    "-c",
    "core.abbrev=40",
    "commit",
    ...prefixedArray(message, "-m"),
    ...files,
    ...customArgs
  ];
  return {
    commands,
    format: "utf-8",
    parser: parseCommitResult
  };
}
function commit_default() {
  return {
    commit(message, ...rest) {
      const next = trailingFunctionArgument(arguments);
      const task = rejectDeprecatedSignatures(message) || commitTask(
        asArray(message),
        asArray(filterType(rest[0], filterStringOrStringArray, [])),
        [
          ...asStringArray(filterType(rest[1], filterArray, [])),
          ...getTrailingOptions(arguments, 0, true)
        ]
      );
      return this._runTask(task, next);
    }
  };
  function rejectDeprecatedSignatures(message) {
    return !filterStringOrStringArray(message) && configurationErrorTask(
      `git.commit: requires the commit message to be supplied as a string/string[]`
    );
  }
}
function first_commit_default() {
  return {
    firstCommit() {
      return this._runTask(
        straightThroughStringTask(["rev-list", "--max-parents=0", "HEAD"], true),
        trailingFunctionArgument(arguments)
      );
    }
  };
}
function hashObjectTask(filePath, write) {
  const commands = ["hash-object", filePath];
  if (write) {
    commands.push("-w");
  }
  return straightThroughStringTask(commands, true);
}
function parseInit(bare, path, text) {
  const response = String(text).trim();
  let result;
  if (result = initResponseRegex.exec(response)) {
    return new InitSummary(bare, path, false, result[1]);
  }
  if (result = reInitResponseRegex.exec(response)) {
    return new InitSummary(bare, path, true, result[1]);
  }
  let gitDir = "";
  const tokens = response.split(" ");
  while (tokens.length) {
    const token = tokens.shift();
    if (token === "in") {
      gitDir = tokens.join(" ");
      break;
    }
  }
  return new InitSummary(bare, path, /^re/i.test(response), gitDir);
}
function hasBareCommand(command) {
  return command.includes(bareCommand);
}
function initTask(bare = false, path, customArgs) {
  const commands = ["init", ...customArgs];
  if (bare && !hasBareCommand(commands)) {
    commands.splice(1, 0, bareCommand);
  }
  return {
    commands,
    format: "utf-8",
    parser(text) {
      return parseInit(commands.includes("--bare"), path, text);
    }
  };
}
function logFormatFromCommand(customArgs) {
  for (let i2 = 0; i2 < customArgs.length; i2++) {
    const format = logFormatRegex.exec(customArgs[i2]);
    if (format) {
      return `--${format[1]}`;
    }
  }
  return "";
}
function isLogFormat(customArg) {
  return logFormatRegex.test(customArg);
}
function getDiffParser(format = "") {
  const parser4 = diffSummaryParsers[format];
  return (stdOut) => parseStringResponse(new DiffSummary(), parser4, stdOut, false);
}
function lineBuilder(tokens, fields) {
  return fields.reduce(
    (line, field, index) => {
      line[field] = tokens[index] || "";
      return line;
    },
    /* @__PURE__ */ Object.create({ diff: null })
  );
}
function createListLogSummaryParser(splitter = SPLITTER, fields = defaultFieldNames, logFormat = "") {
  const parseDiffResult = getDiffParser(logFormat);
  return function(stdOut) {
    const all = toLinesWithContent(
      stdOut.trim(),
      false,
      START_BOUNDARY
    ).map(function(item) {
      const lineDetail = item.split(COMMIT_BOUNDARY);
      const listLogLine = lineBuilder(lineDetail[0].split(splitter), fields);
      if (lineDetail.length > 1 && !!lineDetail[1].trim()) {
        listLogLine.diff = parseDiffResult(lineDetail[1]);
      }
      return listLogLine;
    });
    return {
      all,
      latest: all.length && all[0] || null,
      total: all.length
    };
  };
}
function diffSummaryTask(customArgs) {
  let logFormat = logFormatFromCommand(customArgs);
  const commands = ["diff"];
  if (logFormat === "") {
    logFormat = "--stat";
    commands.push("--stat=4096");
  }
  commands.push(...customArgs);
  return validateLogFormatConfig(commands) || {
    commands,
    format: "utf-8",
    parser: getDiffParser(logFormat)
  };
}
function validateLogFormatConfig(customArgs) {
  const flags = customArgs.filter(isLogFormat);
  if (flags.length > 1) {
    return configurationErrorTask(
      `Summary flags are mutually exclusive - pick one of ${flags.join(",")}`
    );
  }
  if (flags.length && customArgs.includes("-z")) {
    return configurationErrorTask(
      `Summary flag ${flags} parsing is not compatible with null termination option '-z'`
    );
  }
}
function prettyFormat(format, splitter) {
  const fields = [];
  const formatStr = [];
  Object.keys(format).forEach((field) => {
    fields.push(field);
    formatStr.push(String(format[field]));
  });
  return [fields, formatStr.join(splitter)];
}
function userOptions(input) {
  return Object.keys(input).reduce((out, key) => {
    if (!(key in excludeOptions)) {
      out[key] = input[key];
    }
    return out;
  }, {});
}
function parseLogOptions(opt = {}, customArgs = []) {
  const splitter = filterType(opt.splitter, filterString, SPLITTER);
  const format = filterPlainObject(opt.format) ? opt.format : {
    hash: "%H",
    date: opt.strictDate === false ? "%ai" : "%aI",
    message: "%s",
    refs: "%D",
    body: opt.multiLine ? "%B" : "%b",
    author_name: opt.mailMap !== false ? "%aN" : "%an",
    author_email: opt.mailMap !== false ? "%aE" : "%ae"
  };
  const [fields, formatStr] = prettyFormat(format, splitter);
  const suffix = [];
  const command = [
    `--pretty=format:${START_BOUNDARY}${formatStr}${COMMIT_BOUNDARY}`,
    ...customArgs
  ];
  const maxCount = opt.n || opt["max-count"] || opt.maxCount;
  if (maxCount) {
    command.push(`--max-count=${maxCount}`);
  }
  if (opt.from || opt.to) {
    const rangeOperator = opt.symmetric !== false ? "..." : "..";
    suffix.push(`${opt.from || ""}${rangeOperator}${opt.to || ""}`);
  }
  if (filterString(opt.file)) {
    command.push("--follow", c(opt.file));
  }
  appendTaskOptions(userOptions(opt), command);
  return {
    fields,
    splitter,
    commands: [...command, ...suffix]
  };
}
function logTask(splitter, fields, customArgs) {
  const parser4 = createListLogSummaryParser(splitter, fields, logFormatFromCommand(customArgs));
  return {
    commands: ["log", ...customArgs],
    format: "utf-8",
    parser: parser4
  };
}
function log_default() {
  return {
    log(...rest) {
      const next = trailingFunctionArgument(arguments);
      const options = parseLogOptions(
        trailingOptionsArgument(arguments),
        asStringArray(filterType(arguments[0], filterArray, []))
      );
      const task = rejectDeprecatedSignatures(...rest) || validateLogFormatConfig(options.commands) || createLogTask(options);
      return this._runTask(task, next);
    }
  };
  function createLogTask(options) {
    return logTask(options.splitter, options.fields, options.commands);
  }
  function rejectDeprecatedSignatures(from, to) {
    return filterString(from) && filterString(to) && configurationErrorTask(
      `git.log(string, string) should be replaced with git.log({ from: string, to: string })`
    );
  }
}
function objectEnumerationResult(remoteMessages) {
  return remoteMessages.objects = remoteMessages.objects || {
    compressing: 0,
    counting: 0,
    enumerating: 0,
    packReused: 0,
    reused: { count: 0, delta: 0 },
    total: { count: 0, delta: 0 }
  };
}
function asObjectCount(source) {
  const count = /^\s*(\d+)/.exec(source);
  const delta = /delta (\d+)/i.exec(source);
  return {
    count: asNumber(count && count[1] || "0"),
    delta: asNumber(delta && delta[1] || "0")
  };
}
function parseRemoteMessages(_stdOut, stdErr) {
  return parseStringResponse({ remoteMessages: new RemoteMessageSummary() }, parsers2, stdErr);
}
function parsePullErrorResult(stdOut, stdErr) {
  const pullError = parseStringResponse(new PullFailedSummary(), errorParsers, [stdOut, stdErr]);
  return pullError.message && pullError;
}
function mergeTask(customArgs) {
  if (!customArgs.length) {
    return configurationErrorTask("Git.merge requires at least one option");
  }
  return {
    commands: ["merge", ...customArgs],
    format: "utf-8",
    parser(stdOut, stdErr) {
      const merge = parseMergeResult(stdOut, stdErr);
      if (merge.failed) {
        throw new GitResponseError(merge);
      }
      return merge;
    }
  };
}
function pushResultPushedItem(local, remote, status) {
  const deleted = status.includes("deleted");
  const tag = status.includes("tag") || /^refs\/tags/.test(local);
  const alreadyUpdated = !status.includes("new");
  return {
    deleted,
    tag,
    branch: !tag,
    new: !alreadyUpdated,
    alreadyUpdated,
    local,
    remote
  };
}
function pushTagsTask(ref = {}, customArgs) {
  append(customArgs, "--tags");
  return pushTask(ref, customArgs);
}
function pushTask(ref = {}, customArgs) {
  const commands = ["push", ...customArgs];
  if (ref.branch) {
    commands.splice(1, 0, ref.branch);
  }
  if (ref.remote) {
    commands.splice(1, 0, ref.remote);
  }
  remove(commands, "-v");
  append(commands, "--verbose");
  append(commands, "--porcelain");
  return {
    commands,
    format: "utf-8",
    parser: parsePushResult
  };
}
function show_default() {
  return {
    showBuffer() {
      const commands = ["show", ...getTrailingOptions(arguments, 1)];
      if (!commands.includes("--binary")) {
        commands.splice(1, 0, "--binary");
      }
      return this._runTask(
        straightThroughBufferTask(commands),
        trailingFunctionArgument(arguments)
      );
    },
    show() {
      const commands = ["show", ...getTrailingOptions(arguments, 1)];
      return this._runTask(
        straightThroughStringTask(commands),
        trailingFunctionArgument(arguments)
      );
    }
  };
}
function renamedFile(line) {
  const [to, from] = line.split(NULL);
  return {
    from: from || to,
    to
  };
}
function parser3(indexX, indexY, handler) {
  return [`${indexX}${indexY}`, handler];
}
function conflicts(indexX, ...indexY) {
  return indexY.map((y2) => parser3(indexX, y2, (result, file) => result.conflicted.push(file)));
}
function splitLine(result, lineStr) {
  const trimmed2 = lineStr.trim();
  switch (" ") {
    case trimmed2.charAt(2):
      return data(trimmed2.charAt(0), trimmed2.charAt(1), trimmed2.slice(3));
    case trimmed2.charAt(1):
      return data(" ", trimmed2.charAt(0), trimmed2.slice(2));
    default:
      return;
  }
  function data(index, workingDir, path) {
    const raw = `${index}${workingDir}`;
    const handler = parsers6.get(raw);
    if (handler) {
      handler(result, path);
    }
    if (raw !== "##" && raw !== "!!") {
      result.files.push(new FileStatusSummary(path, index, workingDir));
    }
  }
}
function statusTask(customArgs) {
  const commands = [
    "status",
    "--porcelain",
    "-b",
    "-u",
    "--null",
    ...customArgs.filter((arg) => !ignoredOptions.includes(arg))
  ];
  return {
    format: "utf-8",
    commands,
    parser(text) {
      return parseStatusSummary(text);
    }
  };
}
function versionResponse(major = 0, minor = 0, patch = 0, agent = "", installed = true) {
  return Object.defineProperty(
    {
      major,
      minor,
      patch,
      agent,
      installed
    },
    "toString",
    {
      value() {
        return `${this.major}.${this.minor}.${this.patch}`;
      },
      configurable: false,
      enumerable: false
    }
  );
}
function notInstalledResponse() {
  return versionResponse(0, 0, 0, "", false);
}
function version_default() {
  return {
    version() {
      return this._runTask({
        commands: ["--version"],
        format: "utf-8",
        parser: versionParser,
        onError(result, error, done, fail) {
          if (result.exitCode === -2) {
            return done(Buffer.from(NOT_INSTALLED));
          }
          fail(error);
        }
      });
    }
  };
}
function versionParser(stdOut) {
  if (stdOut === NOT_INSTALLED) {
    return notInstalledResponse();
  }
  return parseStringResponse(versionResponse(0, 0, 0, stdOut), parsers7, stdOut);
}
function createCloneTask(api, task, repoPath, ...args) {
  if (!filterString(repoPath)) {
    return configurationErrorTask(`git.${api}() requires a string 'repoPath'`);
  }
  return task(repoPath, filterType(args[0], filterString), getTrailingOptions(arguments));
}
function clone_default() {
  return {
    clone(repo, ...rest) {
      return this._runTask(
        createCloneTask("clone", cloneTask, filterType(repo, filterString), ...rest),
        trailingFunctionArgument(arguments)
      );
    },
    mirror(repo, ...rest) {
      return this._runTask(
        createCloneTask("mirror", cloneMirrorTask, filterType(repo, filterString), ...rest),
        trailingFunctionArgument(arguments)
      );
    }
  };
}
function applyPatchTask(patches, customArgs) {
  return straightThroughStringTask(["apply", ...customArgs, ...patches]);
}
function branchDeletionSuccess(branch, hash) {
  return {
    branch,
    hash,
    success: true
  };
}
function branchDeletionFailure(branch) {
  return {
    branch,
    hash: null,
    success: false
  };
}
function hasBranchDeletionError(data, processExitCode) {
  return processExitCode === 1 && deleteErrorRegex.test(data);
}
function branchStatus(input) {
  return input ? input.charAt(0) : "";
}
function parseBranchSummary(stdOut, currentOnly = false) {
  return parseStringResponse(
    new BranchSummaryResult(),
    currentOnly ? [currentBranchParser] : parsers9,
    stdOut
  );
}
function containsDeleteBranchCommand(commands) {
  const deleteCommands = ["-d", "-D", "--delete"];
  return commands.some((command) => deleteCommands.includes(command));
}
function branchTask(customArgs) {
  const isDelete = containsDeleteBranchCommand(customArgs);
  const isCurrentOnly = customArgs.includes("--show-current");
  const commands = ["branch", ...customArgs];
  if (commands.length === 1) {
    commands.push("-a");
  }
  if (!commands.includes("-v")) {
    commands.splice(1, 0, "-v");
  }
  return {
    format: "utf-8",
    commands,
    parser(stdOut, stdErr) {
      if (isDelete) {
        return parseBranchDeletions(stdOut, stdErr).all[0];
      }
      return parseBranchSummary(stdOut, isCurrentOnly);
    }
  };
}
function branchLocalTask() {
  return {
    format: "utf-8",
    commands: ["branch", "-v"],
    parser(stdOut) {
      return parseBranchSummary(stdOut);
    }
  };
}
function deleteBranchesTask(branches, forceDelete = false) {
  return {
    format: "utf-8",
    commands: ["branch", "-v", forceDelete ? "-D" : "-d", ...branches],
    parser(stdOut, stdErr) {
      return parseBranchDeletions(stdOut, stdErr);
    },
    onError({ exitCode, stdOut }, error, done, fail) {
      if (!hasBranchDeletionError(String(error), exitCode)) {
        return fail(error);
      }
      done(stdOut);
    }
  };
}
function deleteBranchTask(branch, forceDelete = false) {
  const task = {
    format: "utf-8",
    commands: ["branch", "-v", forceDelete ? "-D" : "-d", branch],
    parser(stdOut, stdErr) {
      return parseBranchDeletions(stdOut, stdErr).branches[branch];
    },
    onError({ exitCode, stdErr, stdOut }, error, _2, fail) {
      if (!hasBranchDeletionError(String(error), exitCode)) {
        return fail(error);
      }
      throw new GitResponseError(
        task.parser(bufferToString(stdOut), bufferToString(stdErr)),
        String(error)
      );
    }
  };
  return task;
}
function toPath(input) {
  const path = input.trim().replace(/^["']|["']$/g, "");
  return path && normalize(path);
}
function checkIgnoreTask(paths) {
  return {
    commands: ["check-ignore", ...paths],
    format: "utf-8",
    parser: parseCheckIgnore
  };
}
function parseFetchResult(stdOut, stdErr) {
  const result = {
    raw: stdOut,
    remote: null,
    branches: [],
    tags: [],
    updated: [],
    deleted: []
  };
  return parseStringResponse(result, parsers10, [stdOut, stdErr]);
}
function disallowedCommand(command) {
  return /^--upload-pack(=|$)/.test(command);
}
function fetchTask(remote, branch, customArgs) {
  const commands = ["fetch", ...customArgs];
  if (remote && branch) {
    commands.push(remote, branch);
  }
  const banned = commands.find(disallowedCommand);
  if (banned) {
    return configurationErrorTask(`git.fetch: potential exploit argument blocked.`);
  }
  return {
    commands,
    format: "utf-8",
    parser: parseFetchResult
  };
}
function parseMoveResult(stdOut) {
  return parseStringResponse({ moves: [] }, parsers11, stdOut);
}
function moveTask(from, to) {
  return {
    commands: ["mv", "-v", ...asArray(from), to],
    format: "utf-8",
    parser: parseMoveResult
  };
}
function pullTask(remote, branch, customArgs) {
  const commands = ["pull", ...customArgs];
  if (remote && branch) {
    commands.splice(1, 0, remote, branch);
  }
  return {
    commands,
    format: "utf-8",
    parser(stdOut, stdErr) {
      return parsePullResult(stdOut, stdErr);
    },
    onError(result, _error, _done, fail) {
      const pullError = parsePullErrorResult(
        bufferToString(result.stdOut),
        bufferToString(result.stdErr)
      );
      if (pullError) {
        return fail(new GitResponseError(pullError));
      }
      fail(_error);
    }
  };
}
function parseGetRemotes(text) {
  const remotes = {};
  forEach(text, ([name]) => remotes[name] = { name });
  return Object.values(remotes);
}
function parseGetRemotesVerbose(text) {
  const remotes = {};
  forEach(text, ([name, url, purpose]) => {
    if (!Object.hasOwn(remotes, name)) {
      remotes[name] = {
        name,
        refs: { fetch: "", push: "" }
      };
    }
    if (purpose && url) {
      remotes[name].refs[purpose.replace(/[^a-z]/g, "")] = url;
    }
  });
  return Object.values(remotes);
}
function forEach(text, handler) {
  forEachLineWithContent(text, (line) => handler(line.split(/\s+/)));
}
function addRemoteTask(remoteName, remoteRepo, customArgs) {
  return straightThroughStringTask(["remote", "add", ...customArgs, remoteName, remoteRepo]);
}
function getRemotesTask(verbose) {
  const commands = ["remote"];
  if (verbose) {
    commands.push("-v");
  }
  return {
    commands,
    format: "utf-8",
    parser: verbose ? parseGetRemotesVerbose : parseGetRemotes
  };
}
function listRemotesTask(customArgs) {
  const commands = [...customArgs];
  if (commands[0] !== "ls-remote") {
    commands.unshift("ls-remote");
  }
  return straightThroughStringTask(commands);
}
function remoteTask(customArgs) {
  const commands = [...customArgs];
  if (commands[0] !== "remote") {
    commands.unshift("remote");
  }
  return straightThroughStringTask(commands);
}
function removeRemoteTask(remoteName) {
  return straightThroughStringTask(["remote", "remove", remoteName]);
}
function stashListTask(opt = {}, customArgs) {
  const options = parseLogOptions(opt);
  const commands = ["stash", "list", ...options.commands, ...customArgs];
  const parser4 = createListLogSummaryParser(
    options.splitter,
    options.fields,
    logFormatFromCommand(commands)
  );
  return validateLogFormatConfig(commands) || {
    commands,
    format: "utf-8",
    parser: parser4
  };
}
function addSubModuleTask(repo, path) {
  return subModuleTask(["add", repo, path]);
}
function initSubModuleTask(customArgs) {
  return subModuleTask(["init", ...customArgs]);
}
function subModuleTask(customArgs) {
  const commands = [...customArgs];
  if (commands[0] !== "submodule") {
    commands.unshift("submodule");
  }
  return straightThroughStringTask(commands);
}
function updateSubModuleTask(customArgs) {
  return subModuleTask(["update", ...customArgs]);
}
function singleSorted(a, b2) {
  const aIsNum = Number.isNaN(a);
  const bIsNum = Number.isNaN(b2);
  if (aIsNum !== bIsNum) {
    return aIsNum ? 1 : -1;
  }
  return aIsNum ? sorted(a, b2) : 0;
}
function sorted(a, b2) {
  return a === b2 ? 0 : a > b2 ? 1 : -1;
}
function trimmed(input) {
  return input.trim();
}
function toNumber(input) {
  if (typeof input === "string") {
    return parseInt(input.replace(/^\D+/g, ""), 10) || 0;
  }
  return 0;
}
function tagListTask(customArgs = []) {
  const hasCustomSort = customArgs.some((option) => /^--sort=/.test(option));
  return {
    format: "utf-8",
    commands: ["tag", "-l", ...customArgs],
    parser(text) {
      return parseTagList(text, hasCustomSort);
    }
  };
}
function addTagTask(name) {
  return {
    format: "utf-8",
    commands: ["tag", name],
    parser() {
      return { name };
    }
  };
}
function addAnnotatedTagTask(name, tagMessage) {
  return {
    format: "utf-8",
    commands: ["tag", "-a", "-m", tagMessage, name],
    parser() {
      return { name };
    }
  };
}
function abortPlugin(signal) {
  if (!signal) {
    return;
  }
  const onSpawnAfter = {
    type: "spawn.after",
    action(_data, context) {
      function kill() {
        context.kill(new GitPluginError(void 0, "abort", "Abort signal received"));
      }
      signal.addEventListener("abort", kill);
      context.spawned.on("close", () => signal.removeEventListener("abort", kill));
    }
  };
  const onSpawnBefore = {
    type: "spawn.before",
    action(_data, context) {
      if (signal.aborted) {
        context.kill(new GitPluginError(void 0, "abort", "Abort already signaled"));
      }
    }
  };
  return [onSpawnBefore, onSpawnAfter];
}
function blockUnsafeOperationsPlugin(options = {}) {
  return {
    type: "spawn.args",
    action(args, { env: env2 }) {
      for (const vulnerability of ne(args, env2)) {
        if (options[vulnerability.category] !== true) {
          throw new GitPluginError(void 0, "unsafe", vulnerability.message);
        }
      }
      return args;
    }
  };
}
function commandConfigPrefixingPlugin(configuration) {
  const prefix = prefixedArray(configuration, "-c");
  return {
    type: "spawn.args",
    action(data) {
      return [...prefix, ...data];
    }
  };
}
function completionDetectionPlugin({
  onClose = true,
  onExit = 50
} = {}) {
  function createEvents() {
    let exitCode = -1;
    const events = {
      close: (0, import_promise_deferred2.deferred)(),
      closeTimeout: (0, import_promise_deferred2.deferred)(),
      exit: (0, import_promise_deferred2.deferred)(),
      exitTimeout: (0, import_promise_deferred2.deferred)()
    };
    const result = Promise.race([
      onClose === false ? never : events.closeTimeout.promise,
      onExit === false ? never : events.exitTimeout.promise
    ]);
    configureTimeout(onClose, events.close, events.closeTimeout);
    configureTimeout(onExit, events.exit, events.exitTimeout);
    return {
      close(code) {
        exitCode = code;
        events.close.done();
      },
      exit(code) {
        exitCode = code;
        events.exit.done();
      },
      get exitCode() {
        return exitCode;
      },
      result
    };
  }
  function configureTimeout(flag, event, timeout) {
    if (flag === false) {
      return;
    }
    (flag === true ? event.promise : event.promise.then(() => delay(flag))).then(timeout.done);
  }
  return {
    type: "spawn.after",
    async action(_data, { spawned, close }) {
      const events = createEvents();
      let deferClose = true;
      let quickClose = () => void (deferClose = false);
      spawned.stdout?.on("data", quickClose);
      spawned.stderr?.on("data", quickClose);
      spawned.on("error", quickClose);
      spawned.on("close", (code) => events.close(code));
      spawned.on("exit", (code) => events.exit(code));
      try {
        await events.result;
        if (deferClose) {
          await delay(50);
        }
        close(events.exitCode);
      } catch (err) {
        close(events.exitCode, err);
      }
    }
  };
}
function isBadArgument(arg) {
  return !arg || !/^([a-z]:)?([a-z0-9/.\\_~-]+)$/i.test(arg);
}
function toBinaryConfig(input, allowUnsafe) {
  if (input.length < 1 || input.length > 2) {
    throw new GitPluginError(void 0, "binary", WRONG_NUMBER_ERR);
  }
  const isBad = input.some(isBadArgument);
  if (isBad) {
    if (allowUnsafe) {
      console.warn(WRONG_CHARS_ERR);
    } else {
      throw new GitPluginError(void 0, "binary", WRONG_CHARS_ERR);
    }
  }
  const [binary, prefix] = input;
  return {
    binary,
    prefix
  };
}
function customBinaryPlugin(plugins, input = ["git"], allowUnsafe = false) {
  let config = toBinaryConfig(asArray(input), allowUnsafe);
  plugins.on("binary", (input2) => {
    config = toBinaryConfig(asArray(input2), allowUnsafe);
  });
  plugins.append("spawn.binary", () => {
    return config.binary;
  });
  plugins.append("spawn.args", (data) => {
    return config.prefix ? [config.prefix, ...data] : data;
  });
}
function isTaskError(result) {
  return !!(result.exitCode && result.stdErr.length);
}
function getErrorMessage(result) {
  return Buffer.concat([...result.stdOut, ...result.stdErr]);
}
function errorDetectionHandler(overwrite = false, isError = isTaskError, errorMessage = getErrorMessage) {
  return (error, result) => {
    if (!overwrite && error || !isError(result)) {
      return error;
    }
    return errorMessage(result);
  };
}
function errorDetectionPlugin(config) {
  return {
    type: "task.error",
    action(data, context) {
      const error = config(data.error, {
        stdErr: context.stdErr,
        stdOut: context.stdOut,
        exitCode: context.exitCode
      });
      if (Buffer.isBuffer(error)) {
        return { error: new GitError(void 0, error.toString("utf-8")) };
      }
      return {
        error
      };
    }
  };
}
function progressMonitorPlugin(progress) {
  const progressCommand = "--progress";
  const progressMethods = ["checkout", "clone", "fetch", "pull", "push"];
  const onProgress = {
    type: "spawn.after",
    action(_data, context) {
      if (!context.commands.includes(progressCommand)) {
        return;
      }
      context.spawned.stderr?.on("data", (chunk) => {
        const message = /^([\s\S]+?):\s*(\d+)% \((\d+)\/(\d+)\)/.exec(chunk.toString("utf8"));
        if (!message) {
          return;
        }
        progress({
          method: context.method,
          stage: progressEventStage(message[1]),
          progress: asNumber(message[2]),
          processed: asNumber(message[3]),
          total: asNumber(message[4])
        });
      });
    }
  };
  const onArgs = {
    type: "spawn.args",
    action(args, context) {
      if (!progressMethods.includes(context.method)) {
        return args;
      }
      return including(args, progressCommand);
    }
  };
  return [onArgs, onProgress];
}
function progressEventStage(input) {
  return String(input.toLowerCase().split(" ", 1)) || "unknown";
}
function spawnOptionsPlugin(spawnOptions) {
  const options = pick(spawnOptions, ["uid", "gid"]);
  return {
    type: "spawn.options",
    action(data) {
      return { ...options, ...data };
    }
  };
}
function timeoutPlugin({
  block,
  stdErr = true,
  stdOut = true
}) {
  if (block > 0) {
    return {
      type: "spawn.after",
      action(_data, context) {
        let timeout;
        function wait() {
          timeout && clearTimeout(timeout);
          timeout = setTimeout(kill, block);
        }
        function stop() {
          context.spawned.stdout?.off("data", wait);
          context.spawned.stderr?.off("data", wait);
          context.spawned.off("exit", stop);
          context.spawned.off("close", stop);
          timeout && clearTimeout(timeout);
        }
        function kill() {
          stop();
          context.kill(new GitPluginError(void 0, "timeout", `block timeout reached`));
        }
        stdOut && context.spawned.stdout?.on("data", wait);
        stdErr && context.spawned.stderr?.on("data", wait);
        context.spawned.on("exit", stop);
        context.spawned.on("close", stop);
        wait();
      }
    };
  }
}
function suffixPathsPlugin() {
  return {
    type: "spawn.args",
    action(data) {
      const prefix = [];
      let suffix;
      function append2(args) {
        (suffix = suffix || []).push(...args);
      }
      for (let i2 = 0; i2 < data.length; i2++) {
        const param = data[i2];
        if (r(param)) {
          append2(o(param));
          continue;
        }
        if (param === "--") {
          append2(
            data.slice(i2 + 1).flatMap((item) => r(item) && o(item) || item)
          );
          break;
        }
        prefix.push(param);
      }
      return !suffix ? prefix : [...prefix, "--", ...suffix.map(String)];
    }
  };
}
function gitInstanceFactory(baseDir, options) {
  const plugins = new PluginStore();
  const config = createInstanceConfig(
    baseDir && (typeof baseDir === "string" ? { baseDir } : baseDir) || {},
    options
  );
  if (!folderExists(config.baseDir)) {
    throw new GitConstructError(
      config,
      `Cannot use simple-git on a directory that does not exist`
    );
  }
  if (Array.isArray(config.config)) {
    plugins.add(commandConfigPrefixingPlugin(config.config));
  }
  plugins.add(blockUnsafeOperationsPlugin(config.unsafe));
  plugins.add(completionDetectionPlugin(config.completion));
  config.abort && plugins.add(abortPlugin(config.abort));
  config.progress && plugins.add(progressMonitorPlugin(config.progress));
  config.timeout && plugins.add(timeoutPlugin(config.timeout));
  config.spawnOptions && plugins.add(spawnOptionsPlugin(config.spawnOptions));
  plugins.add(suffixPathsPlugin());
  plugins.add(errorDetectionPlugin(errorDetectionHandler(true)));
  config.errors && plugins.add(errorDetectionPlugin(config.errors));
  customBinaryPlugin(plugins, config.binary, config.unsafe?.allowUnsafeCustomBinary);
  return new Git(config, plugins);
}
var import_file_exists, import_debug, import_promise_deferred, import_promise_deferred2, __defProp2, __getOwnPropDesc2, __getOwnPropNames2, __hasOwnProp2, __esm2, __commonJS2, __export2, __copyProps2, __toCommonJS, GitError, init_git_error, GitResponseError, init_git_response_error, TaskConfigurationError, init_task_configuration_error, NULL, NOOP, objectToString, init_util, filterArray, filterNumber, filterString, filterStringOrStringArray, filterHasLength, init_argument_filters, ExitCodes, init_exit_codes, GitOutputStreams, init_git_output_streams, LineParser, RemoteLineParser, init_line_parser, defaultOptions, init_simple_git_options, init_task_options, init_task_parser, utils_exports, init_utils, check_is_repo_exports, CheckRepoActions, onError, parser, init_check_is_repo, CleanResponse, removalRegexp, dryRunRemovalRegexp, isFolderRegexp, init_CleanSummary, task_exports, EMPTY_COMMANDS, init_task, clean_exports, CONFIG_ERROR_INTERACTIVE_MODE, CONFIG_ERROR_MODE_REQUIRED, CONFIG_ERROR_UNKNOWN_OPTION, CleanOptions, CleanOptionValues, init_clean, ConfigList, init_ConfigList, GitConfigScope, init_config, DiffNameStatus, diffNameStatus, init_diff_name_status, disallowedOptions, Query, _a, GrepQuery, init_grep, reset_exports, ResetMode, validResetModes, init_reset, init_git_logger, TasksPendingQueue, init_tasks_pending_queue, GitExecutorChain, init_git_executor_chain, git_executor_exports, GitExecutor, init_git_executor, init_task_callback, init_change_working_directory, init_checkout, parser2, init_count_objects, parsers, init_parse_commit, init_commit, init_first_commit, init_hash_object, InitSummary, initResponseRegex, reInitResponseRegex, init_InitSummary, bareCommand, init_init, logFormatRegex, init_log_format, DiffSummary, init_DiffSummary, statParser, numStatParser, nameOnlyParser, nameStatusParser, diffSummaryParsers, init_parse_diff_summary, START_BOUNDARY, COMMIT_BOUNDARY, SPLITTER, defaultFieldNames, init_parse_list_log_summary, diff_exports, init_diff, excludeOptions, init_log, MergeSummaryConflict, MergeSummaryDetail, init_MergeSummary, PullSummary, PullFailedSummary, init_PullSummary, remoteMessagesObjectParsers, init_parse_remote_objects, parsers2, RemoteMessageSummary, init_parse_remote_messages, FILE_UPDATE_REGEX, SUMMARY_REGEX, ACTION_REGEX, parsers3, errorParsers, parsePullDetail, parsePullResult, init_parse_pull, parsers4, parseMergeResult, parseMergeDetail, init_parse_merge, init_merge, parsers5, parsePushResult, parsePushDetail, init_parse_push, push_exports, init_push, init_show, fromPathRegex, FileStatusSummary, init_FileStatusSummary, StatusSummary, parsers6, parseStatusSummary, init_StatusSummary, ignoredOptions, init_status, NOT_INSTALLED, parsers7, init_version, cloneTask, cloneMirrorTask, init_clone, simple_git_api_exports, SimpleGitApi, init_simple_git_api, scheduler_exports, createScheduledTask, Scheduler, init_scheduler, apply_patch_exports, init_apply_patch, BranchDeletionBatch, init_BranchDeleteSummary, deleteSuccessRegex, deleteErrorRegex, parsers8, parseBranchDeletions, init_parse_branch_delete, BranchSummaryResult, init_BranchSummary, parsers9, currentBranchParser, init_parse_branch, branch_exports, init_branch, parseCheckIgnore, init_CheckIgnore, check_ignore_exports, init_check_ignore, parsers10, init_parse_fetch, fetch_exports, init_fetch, parsers11, init_parse_move, move_exports, init_move, pull_exports, init_pull, init_GetRemoteSummary, remote_exports, init_remote, stash_list_exports, init_stash_list, sub_module_exports, init_sub_module, TagList, parseTagList, init_TagList, tag_exports, init_tag, require_git, GitConstructError, GitPluginError, never, WRONG_NUMBER_ERR, WRONG_CHARS_ERR, PluginStore, Git, simpleGit;
var init_esm = __esm({
  "node_modules/simple-git/dist/esm/index.js"() {
    import_file_exists = __toESM(require_dist(), 1);
    init_dist();
    init_dist();
    import_debug = __toESM(require_src(), 1);
    init_dist();
    init_dist();
    import_promise_deferred = __toESM(require_dist2(), 1);
    init_dist();
    init_dist2();
    import_promise_deferred2 = __toESM(require_dist2(), 1);
    init_dist();
    __defProp2 = Object.defineProperty;
    __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    __getOwnPropNames2 = Object.getOwnPropertyNames;
    __hasOwnProp2 = Object.prototype.hasOwnProperty;
    __esm2 = (fn, res) => function __init() {
      return fn && (res = (0, fn[__getOwnPropNames2(fn)[0]])(fn = 0)), res;
    };
    __commonJS2 = (cb, mod) => function __require2() {
      return mod || (0, cb[__getOwnPropNames2(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    };
    __export2 = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    init_git_error = __esm2({
      "src/lib/errors/git-error.ts"() {
        "use strict";
        GitError = class extends Error {
          constructor(task, message) {
            super(message);
            this.task = task;
            Object.setPrototypeOf(this, new.target.prototype);
          }
        };
      }
    });
    init_git_response_error = __esm2({
      "src/lib/errors/git-response-error.ts"() {
        "use strict";
        init_git_error();
        GitResponseError = class extends GitError {
          constructor(git, message) {
            super(void 0, message || String(git));
            this.git = git;
          }
        };
      }
    });
    init_task_configuration_error = __esm2({
      "src/lib/errors/task-configuration-error.ts"() {
        "use strict";
        init_git_error();
        TaskConfigurationError = class extends GitError {
          constructor(message) {
            super(void 0, message);
          }
        };
      }
    });
    init_util = __esm2({
      "src/lib/utils/util.ts"() {
        "use strict";
        init_argument_filters();
        NULL = "\0";
        NOOP = () => {
        };
        objectToString = Object.prototype.toString.call.bind(Object.prototype.toString);
      }
    });
    init_argument_filters = __esm2({
      "src/lib/utils/argument-filters.ts"() {
        "use strict";
        init_util();
        filterArray = (input) => {
          return Array.isArray(input);
        };
        filterNumber = (input) => {
          return typeof input === "number";
        };
        filterString = (input) => {
          return typeof input === "string" || r(input);
        };
        filterStringOrStringArray = (input) => {
          return filterString(input) || Array.isArray(input) && input.every(filterString);
        };
        filterHasLength = (input) => {
          if (input == null || "number|boolean|function".includes(typeof input)) {
            return false;
          }
          return typeof input.length === "number";
        };
      }
    });
    init_exit_codes = __esm2({
      "src/lib/utils/exit-codes.ts"() {
        "use strict";
        ExitCodes = /* @__PURE__ */ ((ExitCodes2) => {
          ExitCodes2[ExitCodes2["SUCCESS"] = 0] = "SUCCESS";
          ExitCodes2[ExitCodes2["ERROR"] = 1] = "ERROR";
          ExitCodes2[ExitCodes2["NOT_FOUND"] = -2] = "NOT_FOUND";
          ExitCodes2[ExitCodes2["UNCLEAN"] = 128] = "UNCLEAN";
          return ExitCodes2;
        })(ExitCodes || {});
      }
    });
    init_git_output_streams = __esm2({
      "src/lib/utils/git-output-streams.ts"() {
        "use strict";
        GitOutputStreams = class _GitOutputStreams {
          constructor(stdOut, stdErr) {
            this.stdOut = stdOut;
            this.stdErr = stdErr;
          }
          asStrings() {
            return new _GitOutputStreams(this.stdOut.toString("utf8"), this.stdErr.toString("utf8"));
          }
        };
      }
    });
    init_line_parser = __esm2({
      "src/lib/utils/line-parser.ts"() {
        "use strict";
        LineParser = class {
          constructor(regExp, useMatches) {
            this.matches = [];
            this.useMatches = useMatchesDefault;
            this.parse = (line, target) => {
              this.resetMatches();
              if (!this._regExp.every((reg, index) => this.addMatch(reg, index, line(index)))) {
                return false;
              }
              return this.useMatches(target, this.prepareMatches()) !== false;
            };
            this._regExp = Array.isArray(regExp) ? regExp : [regExp];
            if (useMatches) {
              this.useMatches = useMatches;
            }
          }
          resetMatches() {
            this.matches.length = 0;
          }
          prepareMatches() {
            return this.matches;
          }
          addMatch(reg, index, line) {
            const matched = line && reg.exec(line);
            if (matched) {
              this.pushMatch(index, matched);
            }
            return !!matched;
          }
          pushMatch(_index, matched) {
            this.matches.push(...matched.slice(1));
          }
        };
        RemoteLineParser = class extends LineParser {
          addMatch(reg, index, line) {
            return /^remote:\s/.test(String(line)) && super.addMatch(reg, index, line);
          }
          pushMatch(index, matched) {
            if (index > 0 || matched.length > 1) {
              super.pushMatch(index, matched);
            }
          }
        };
      }
    });
    init_simple_git_options = __esm2({
      "src/lib/utils/simple-git-options.ts"() {
        "use strict";
        defaultOptions = {
          binary: "git",
          maxConcurrentProcesses: 5,
          config: [],
          trimmed: false
        };
      }
    });
    init_task_options = __esm2({
      "src/lib/utils/task-options.ts"() {
        "use strict";
        init_argument_filters();
        init_util();
      }
    });
    init_task_parser = __esm2({
      "src/lib/utils/task-parser.ts"() {
        "use strict";
        init_util();
      }
    });
    utils_exports = {};
    __export2(utils_exports, {
      ExitCodes: () => ExitCodes,
      GitOutputStreams: () => GitOutputStreams,
      LineParser: () => LineParser,
      NOOP: () => NOOP,
      NULL: () => NULL,
      RemoteLineParser: () => RemoteLineParser,
      append: () => append,
      appendTaskOptions: () => appendTaskOptions,
      asArray: () => asArray,
      asCamelCase: () => asCamelCase,
      asFunction: () => asFunction,
      asNumber: () => asNumber,
      asStringArray: () => asStringArray,
      bufferToString: () => bufferToString,
      callTaskParser: () => callTaskParser,
      createInstanceConfig: () => createInstanceConfig,
      delay: () => delay,
      filterArray: () => filterArray,
      filterFunction: () => filterFunction,
      filterHasLength: () => filterHasLength,
      filterNumber: () => filterNumber,
      filterPlainObject: () => filterPlainObject,
      filterPrimitives: () => filterPrimitives,
      filterString: () => filterString,
      filterStringOrStringArray: () => filterStringOrStringArray,
      filterType: () => filterType,
      first: () => first,
      folderExists: () => folderExists,
      forEachLineWithContent: () => forEachLineWithContent,
      getTrailingOptions: () => getTrailingOptions,
      including: () => including,
      isUserFunction: () => isUserFunction,
      last: () => last,
      objectToString: () => objectToString,
      orVoid: () => orVoid,
      parseStringResponse: () => parseStringResponse,
      pick: () => pick,
      prefixedArray: () => prefixedArray,
      remove: () => remove,
      splitOn: () => splitOn,
      toLinesWithContent: () => toLinesWithContent,
      trailingFunctionArgument: () => trailingFunctionArgument,
      trailingOptionsArgument: () => trailingOptionsArgument
    });
    init_utils = __esm2({
      "src/lib/utils/index.ts"() {
        "use strict";
        init_argument_filters();
        init_exit_codes();
        init_git_output_streams();
        init_line_parser();
        init_simple_git_options();
        init_task_options();
        init_task_parser();
        init_util();
      }
    });
    check_is_repo_exports = {};
    __export2(check_is_repo_exports, {
      CheckRepoActions: () => CheckRepoActions,
      checkIsBareRepoTask: () => checkIsBareRepoTask,
      checkIsRepoRootTask: () => checkIsRepoRootTask,
      checkIsRepoTask: () => checkIsRepoTask
    });
    init_check_is_repo = __esm2({
      "src/lib/tasks/check-is-repo.ts"() {
        "use strict";
        init_utils();
        CheckRepoActions = /* @__PURE__ */ ((CheckRepoActions2) => {
          CheckRepoActions2["BARE"] = "bare";
          CheckRepoActions2["IN_TREE"] = "tree";
          CheckRepoActions2["IS_REPO_ROOT"] = "root";
          return CheckRepoActions2;
        })(CheckRepoActions || {});
        onError = ({ exitCode }, error, done, fail) => {
          if (exitCode === 128 && isNotRepoMessage(error)) {
            return done(Buffer.from("false"));
          }
          fail(error);
        };
        parser = (text) => {
          return text.trim() === "true";
        };
      }
    });
    init_CleanSummary = __esm2({
      "src/lib/responses/CleanSummary.ts"() {
        "use strict";
        init_utils();
        CleanResponse = class {
          constructor(dryRun) {
            this.dryRun = dryRun;
            this.paths = [];
            this.files = [];
            this.folders = [];
          }
        };
        removalRegexp = /^[a-z]+\s*/i;
        dryRunRemovalRegexp = /^[a-z]+\s+[a-z]+\s*/i;
        isFolderRegexp = /\/$/;
      }
    });
    task_exports = {};
    __export2(task_exports, {
      EMPTY_COMMANDS: () => EMPTY_COMMANDS,
      adhocExecTask: () => adhocExecTask,
      configurationErrorTask: () => configurationErrorTask,
      isBufferTask: () => isBufferTask,
      isEmptyTask: () => isEmptyTask,
      straightThroughBufferTask: () => straightThroughBufferTask,
      straightThroughStringTask: () => straightThroughStringTask
    });
    init_task = __esm2({
      "src/lib/tasks/task.ts"() {
        "use strict";
        init_task_configuration_error();
        EMPTY_COMMANDS = [];
      }
    });
    clean_exports = {};
    __export2(clean_exports, {
      CONFIG_ERROR_INTERACTIVE_MODE: () => CONFIG_ERROR_INTERACTIVE_MODE,
      CONFIG_ERROR_MODE_REQUIRED: () => CONFIG_ERROR_MODE_REQUIRED,
      CONFIG_ERROR_UNKNOWN_OPTION: () => CONFIG_ERROR_UNKNOWN_OPTION,
      CleanOptions: () => CleanOptions,
      cleanTask: () => cleanTask,
      cleanWithOptionsTask: () => cleanWithOptionsTask,
      isCleanOptionsArray: () => isCleanOptionsArray
    });
    init_clean = __esm2({
      "src/lib/tasks/clean.ts"() {
        "use strict";
        init_CleanSummary();
        init_utils();
        init_task();
        CONFIG_ERROR_INTERACTIVE_MODE = "Git clean interactive mode is not supported";
        CONFIG_ERROR_MODE_REQUIRED = 'Git clean mode parameter ("n" or "f") is required';
        CONFIG_ERROR_UNKNOWN_OPTION = "Git clean unknown option found in: ";
        CleanOptions = /* @__PURE__ */ ((CleanOptions2) => {
          CleanOptions2["DRY_RUN"] = "n";
          CleanOptions2["FORCE"] = "f";
          CleanOptions2["IGNORED_INCLUDED"] = "x";
          CleanOptions2["IGNORED_ONLY"] = "X";
          CleanOptions2["EXCLUDING"] = "e";
          CleanOptions2["QUIET"] = "q";
          CleanOptions2["RECURSIVE"] = "d";
          return CleanOptions2;
        })(CleanOptions || {});
        CleanOptionValues = /* @__PURE__ */ new Set([
          "i",
          ...asStringArray(Object.values(CleanOptions))
        ]);
      }
    });
    init_ConfigList = __esm2({
      "src/lib/responses/ConfigList.ts"() {
        "use strict";
        init_utils();
        ConfigList = class {
          constructor() {
            this.files = [];
            this.values = /* @__PURE__ */ Object.create(null);
          }
          get all() {
            if (!this._all) {
              this._all = this.files.reduce((all, file) => {
                return Object.assign(all, this.values[file]);
              }, {});
            }
            return this._all;
          }
          addFile(file) {
            if (!(file in this.values)) {
              const latest = last(this.files);
              this.values[file] = latest ? Object.create(this.values[latest]) : {};
              this.files.push(file);
            }
            return this.values[file];
          }
          addValue(file, key, value) {
            const values = this.addFile(file);
            if (!Object.hasOwn(values, key)) {
              values[key] = value;
            } else if (Array.isArray(values[key])) {
              values[key].push(value);
            } else {
              values[key] = [values[key], value];
            }
            this._all = void 0;
          }
        };
      }
    });
    init_config = __esm2({
      "src/lib/tasks/config.ts"() {
        "use strict";
        init_ConfigList();
        init_utils();
        GitConfigScope = /* @__PURE__ */ ((GitConfigScope2) => {
          GitConfigScope2["system"] = "system";
          GitConfigScope2["global"] = "global";
          GitConfigScope2["local"] = "local";
          GitConfigScope2["worktree"] = "worktree";
          return GitConfigScope2;
        })(GitConfigScope || {});
      }
    });
    init_diff_name_status = __esm2({
      "src/lib/tasks/diff-name-status.ts"() {
        "use strict";
        DiffNameStatus = /* @__PURE__ */ ((DiffNameStatus2) => {
          DiffNameStatus2["ADDED"] = "A";
          DiffNameStatus2["COPIED"] = "C";
          DiffNameStatus2["DELETED"] = "D";
          DiffNameStatus2["MODIFIED"] = "M";
          DiffNameStatus2["RENAMED"] = "R";
          DiffNameStatus2["CHANGED"] = "T";
          DiffNameStatus2["UNMERGED"] = "U";
          DiffNameStatus2["UNKNOWN"] = "X";
          DiffNameStatus2["BROKEN"] = "B";
          return DiffNameStatus2;
        })(DiffNameStatus || {});
        diffNameStatus = new Set(Object.values(DiffNameStatus));
      }
    });
    init_grep = __esm2({
      "src/lib/tasks/grep.ts"() {
        "use strict";
        init_utils();
        init_task();
        disallowedOptions = ["-h"];
        Query = Symbol("grepQuery");
        GrepQuery = class {
          constructor() {
            this[_a] = [];
          }
          *[(_a = Query, Symbol.iterator)]() {
            for (const query of this[Query]) {
              yield query;
            }
          }
          and(...and) {
            and.length && this[Query].push("--and", "(", ...prefixedArray(and, "-e"), ")");
            return this;
          }
          param(...param) {
            this[Query].push(...prefixedArray(param, "-e"));
            return this;
          }
        };
      }
    });
    reset_exports = {};
    __export2(reset_exports, {
      ResetMode: () => ResetMode,
      getResetMode: () => getResetMode,
      resetTask: () => resetTask
    });
    init_reset = __esm2({
      "src/lib/tasks/reset.ts"() {
        "use strict";
        init_utils();
        init_task();
        ResetMode = /* @__PURE__ */ ((ResetMode2) => {
          ResetMode2["MIXED"] = "mixed";
          ResetMode2["SOFT"] = "soft";
          ResetMode2["HARD"] = "hard";
          ResetMode2["MERGE"] = "merge";
          ResetMode2["KEEP"] = "keep";
          return ResetMode2;
        })(ResetMode || {});
        validResetModes = asStringArray(Object.values(ResetMode));
      }
    });
    init_git_logger = __esm2({
      "src/lib/git-logger.ts"() {
        "use strict";
        init_utils();
        import_debug.default.formatters.L = (value) => String(filterHasLength(value) ? value.length : "-");
        import_debug.default.formatters.B = (value) => {
          if (Buffer.isBuffer(value)) {
            return value.toString("utf8");
          }
          return objectToString(value);
        };
      }
    });
    init_tasks_pending_queue = __esm2({
      "src/lib/runners/tasks-pending-queue.ts"() {
        "use strict";
        init_git_error();
        init_git_logger();
        TasksPendingQueue = class _TasksPendingQueue {
          constructor(logLabel = "GitExecutor") {
            this.logLabel = logLabel;
            this._queue = /* @__PURE__ */ new Map();
          }
          withProgress(task) {
            return this._queue.get(task);
          }
          createProgress(task) {
            const name = _TasksPendingQueue.getName(task.commands[0]);
            const logger = createLogger(this.logLabel, name);
            return {
              task,
              logger,
              name
            };
          }
          push(task) {
            const progress = this.createProgress(task);
            progress.logger("Adding task to the queue, commands = %o", task.commands);
            this._queue.set(task, progress);
            return progress;
          }
          fatal(err) {
            for (const [task, { logger }] of Array.from(this._queue.entries())) {
              if (task === err.task) {
                logger.info(`Failed %o`, err);
                logger(
                  `Fatal exception, any as-yet un-started tasks run through this executor will not be attempted`
                );
              } else {
                logger.info(
                  `A fatal exception occurred in a previous task, the queue has been purged: %o`,
                  err.message
                );
              }
              this.complete(task);
            }
            if (this._queue.size !== 0) {
              throw new Error(`Queue size should be zero after fatal: ${this._queue.size}`);
            }
          }
          complete(task) {
            const progress = this.withProgress(task);
            if (progress) {
              this._queue.delete(task);
            }
          }
          attempt(task) {
            const progress = this.withProgress(task);
            if (!progress) {
              throw new GitError(void 0, "TasksPendingQueue: attempt called for an unknown task");
            }
            progress.logger("Starting task");
            return progress;
          }
          static getName(name = "empty") {
            return `task:${name}:${++_TasksPendingQueue.counter}`;
          }
          static {
            this.counter = 0;
          }
        };
      }
    });
    init_git_executor_chain = __esm2({
      "src/lib/runners/git-executor-chain.ts"() {
        "use strict";
        init_git_error();
        init_task();
        init_utils();
        init_tasks_pending_queue();
        GitExecutorChain = class {
          constructor(_executor, _scheduler, _plugins) {
            this._executor = _executor;
            this._scheduler = _scheduler;
            this._plugins = _plugins;
            this._chain = Promise.resolve();
            this._queue = new TasksPendingQueue();
          }
          get cwd() {
            return this._cwd || this._executor.cwd;
          }
          set cwd(cwd) {
            this._cwd = cwd;
          }
          get env() {
            return this._executor.env;
          }
          get outputHandler() {
            return this._executor.outputHandler;
          }
          chain() {
            return this;
          }
          push(task) {
            this._queue.push(task);
            return this._chain = this._chain.then(() => this.attemptTask(task));
          }
          async attemptTask(task) {
            const onScheduleComplete = await this._scheduler.next();
            const onQueueComplete = () => this._queue.complete(task);
            try {
              const { logger } = this._queue.attempt(task);
              return await (isEmptyTask(task) ? this.attemptEmptyTask(task, logger) : this.attemptRemoteTask(task, logger));
            } catch (e) {
              throw this.onFatalException(task, e);
            } finally {
              onQueueComplete();
              onScheduleComplete();
            }
          }
          onFatalException(task, e) {
            const gitError = e instanceof GitError ? Object.assign(e, { task }) : new GitError(task, e && String(e));
            this._chain = Promise.resolve();
            this._queue.fatal(gitError);
            return gitError;
          }
          async attemptRemoteTask(task, logger) {
            const binary = this._plugins.exec("spawn.binary", "", pluginContext(task, task.commands));
            const args = this._plugins.exec("spawn.args", [...task.commands], {
              ...pluginContext(task, task.commands),
              env: { ...this.env }
            });
            const raw = await this.gitResponse(
              task,
              binary,
              args,
              this.outputHandler,
              logger.step("SPAWN")
            );
            const outputStreams = await this.handleTaskData(task, args, raw, logger.step("HANDLE"));
            logger(`passing response to task's parser as a %s`, task.format);
            if (isBufferTask(task)) {
              return callTaskParser(task.parser, outputStreams);
            }
            return callTaskParser(task.parser, outputStreams.asStrings());
          }
          async attemptEmptyTask(task, logger) {
            logger(`empty task bypassing child process to call to task's parser`);
            return task.parser(this);
          }
          handleTaskData(task, args, result, logger) {
            const { exitCode, rejection, stdOut, stdErr } = result;
            return new Promise((done, fail) => {
              logger(`Preparing to handle process response exitCode=%d stdOut=`, exitCode);
              const { error } = this._plugins.exec(
                "task.error",
                { error: rejection },
                {
                  ...pluginContext(task, args),
                  ...result
                }
              );
              if (error && task.onError) {
                logger.info(`exitCode=%s handling with custom error handler`);
                return task.onError(
                  result,
                  error,
                  (newStdOut) => {
                    logger.info(`custom error handler treated as success`);
                    logger(`custom error returned a %s`, objectToString(newStdOut));
                    done(
                      new GitOutputStreams(
                        Array.isArray(newStdOut) ? Buffer.concat(newStdOut) : newStdOut,
                        Buffer.concat(stdErr)
                      )
                    );
                  },
                  fail
                );
              }
              if (error) {
                logger.info(
                  `handling as error: exitCode=%s stdErr=%s rejection=%o`,
                  exitCode,
                  stdErr.length,
                  rejection
                );
                return fail(error);
              }
              logger.info(`retrieving task output complete`);
              done(new GitOutputStreams(Buffer.concat(stdOut), Buffer.concat(stdErr)));
            });
          }
          async gitResponse(task, command, args, outputHandler, logger) {
            const outputLogger = logger.sibling("output");
            const spawnOptions = this._plugins.exec(
              "spawn.options",
              {
                cwd: this.cwd,
                env: this.env,
                windowsHide: true
              },
              pluginContext(task, task.commands)
            );
            return new Promise((done) => {
              const stdOut = [];
              const stdErr = [];
              logger.info(`%s %o`, command, args);
              logger("%O", spawnOptions);
              let rejection = this._beforeSpawn(task, args);
              if (rejection) {
                return done({
                  stdOut,
                  stdErr,
                  exitCode: 9901,
                  rejection
                });
              }
              this._plugins.exec("spawn.before", void 0, {
                ...pluginContext(task, args),
                kill(reason) {
                  rejection = reason || rejection;
                }
              });
              const spawned = spawn(command, args, spawnOptions);
              spawned.stdout.on(
                "data",
                onDataReceived(stdOut, "stdOut", logger, outputLogger.step("stdOut"))
              );
              spawned.stderr.on(
                "data",
                onDataReceived(stdErr, "stdErr", logger, outputLogger.step("stdErr"))
              );
              spawned.on("error", onErrorReceived(stdErr, logger));
              if (outputHandler) {
                logger(`Passing child process stdOut/stdErr to custom outputHandler`);
                outputHandler(command, spawned.stdout, spawned.stderr, [...args]);
              }
              this._plugins.exec("spawn.after", void 0, {
                ...pluginContext(task, args),
                spawned,
                close(exitCode, reason) {
                  done({
                    stdOut,
                    stdErr,
                    exitCode,
                    rejection: rejection || reason
                  });
                },
                kill(reason) {
                  if (spawned.killed) {
                    return;
                  }
                  rejection = reason;
                  spawned.kill("SIGINT");
                }
              });
            });
          }
          _beforeSpawn(task, args) {
            let rejection;
            this._plugins.exec("spawn.before", void 0, {
              ...pluginContext(task, args),
              kill(reason) {
                rejection = reason || rejection;
              }
            });
            return rejection;
          }
        };
      }
    });
    git_executor_exports = {};
    __export2(git_executor_exports, {
      GitExecutor: () => GitExecutor
    });
    init_git_executor = __esm2({
      "src/lib/runners/git-executor.ts"() {
        "use strict";
        init_git_executor_chain();
        GitExecutor = class {
          constructor(cwd, _scheduler, _plugins) {
            this.cwd = cwd;
            this._scheduler = _scheduler;
            this._plugins = _plugins;
            this._chain = new GitExecutorChain(this, this._scheduler, this._plugins);
          }
          chain() {
            return new GitExecutorChain(this, this._scheduler, this._plugins);
          }
          push(task) {
            return this._chain.push(task);
          }
        };
      }
    });
    init_task_callback = __esm2({
      "src/lib/task-callback.ts"() {
        "use strict";
        init_git_response_error();
        init_utils();
      }
    });
    init_change_working_directory = __esm2({
      "src/lib/tasks/change-working-directory.ts"() {
        "use strict";
        init_utils();
        init_task();
      }
    });
    init_checkout = __esm2({
      "src/lib/tasks/checkout.ts"() {
        "use strict";
        init_utils();
        init_task();
      }
    });
    init_count_objects = __esm2({
      "src/lib/tasks/count-objects.ts"() {
        "use strict";
        init_utils();
        parser2 = new LineParser(
          /([a-z-]+): (\d+)$/,
          (result, [key, value]) => {
            const property = asCamelCase(key);
            if (Object.hasOwn(result, property)) {
              result[property] = asNumber(value);
            }
          }
        );
      }
    });
    init_parse_commit = __esm2({
      "src/lib/parsers/parse-commit.ts"() {
        "use strict";
        init_utils();
        parsers = [
          new LineParser(/^\[([^\s]+)( \([^)]+\))? ([^\]]+)/, (result, [branch, root, commit]) => {
            result.branch = branch;
            result.commit = commit;
            result.root = !!root;
          }),
          new LineParser(/\s*Author:\s(.+)/i, (result, [author]) => {
            const parts = author.split("<");
            const email = parts.pop();
            if (!email || !email.includes("@")) {
              return;
            }
            result.author = {
              email: email.substr(0, email.length - 1),
              name: parts.join("<").trim()
            };
          }),
          new LineParser(
            /(\d+)[^,]*(?:,\s*(\d+)[^,]*)(?:,\s*(\d+))/g,
            (result, [changes, insertions, deletions]) => {
              result.summary.changes = parseInt(changes, 10) || 0;
              result.summary.insertions = parseInt(insertions, 10) || 0;
              result.summary.deletions = parseInt(deletions, 10) || 0;
            }
          ),
          new LineParser(
            /^(\d+)[^,]*(?:,\s*(\d+)[^(]+\(([+-]))?/,
            (result, [changes, lines, direction]) => {
              result.summary.changes = parseInt(changes, 10) || 0;
              const count = parseInt(lines, 10) || 0;
              if (direction === "-") {
                result.summary.deletions = count;
              } else if (direction === "+") {
                result.summary.insertions = count;
              }
            }
          )
        ];
      }
    });
    init_commit = __esm2({
      "src/lib/tasks/commit.ts"() {
        "use strict";
        init_parse_commit();
        init_utils();
        init_task();
      }
    });
    init_first_commit = __esm2({
      "src/lib/tasks/first-commit.ts"() {
        "use strict";
        init_utils();
        init_task();
      }
    });
    init_hash_object = __esm2({
      "src/lib/tasks/hash-object.ts"() {
        "use strict";
        init_task();
      }
    });
    init_InitSummary = __esm2({
      "src/lib/responses/InitSummary.ts"() {
        "use strict";
        InitSummary = class {
          constructor(bare, path, existing, gitDir) {
            this.bare = bare;
            this.path = path;
            this.existing = existing;
            this.gitDir = gitDir;
          }
        };
        initResponseRegex = /^Init.+ repository in (.+)$/;
        reInitResponseRegex = /^Rein.+ in (.+)$/;
      }
    });
    init_init = __esm2({
      "src/lib/tasks/init.ts"() {
        "use strict";
        init_InitSummary();
        bareCommand = "--bare";
      }
    });
    init_log_format = __esm2({
      "src/lib/args/log-format.ts"() {
        "use strict";
        logFormatRegex = /^--(stat|numstat|name-only|name-status)(=|$)/;
      }
    });
    init_DiffSummary = __esm2({
      "src/lib/responses/DiffSummary.ts"() {
        "use strict";
        DiffSummary = class {
          constructor() {
            this.changed = 0;
            this.deletions = 0;
            this.insertions = 0;
            this.files = [];
          }
        };
      }
    });
    init_parse_diff_summary = __esm2({
      "src/lib/parsers/parse-diff-summary.ts"() {
        "use strict";
        init_log_format();
        init_DiffSummary();
        init_diff_name_status();
        init_utils();
        statParser = [
          new LineParser(
            /^(.+)\s+\|\s+(\d+)(\s+[+\-]+)?$/,
            (result, [file, changes, alterations = ""]) => {
              result.files.push({
                file: file.trim(),
                changes: asNumber(changes),
                insertions: alterations.replace(/[^+]/g, "").length,
                deletions: alterations.replace(/[^-]/g, "").length,
                binary: false
              });
            }
          ),
          new LineParser(
            /^(.+) \|\s+Bin ([0-9.]+) -> ([0-9.]+) ([a-z]+)/,
            (result, [file, before, after]) => {
              result.files.push({
                file: file.trim(),
                before: asNumber(before),
                after: asNumber(after),
                binary: true
              });
            }
          ),
          new LineParser(
            /(\d+) files? changed\s*((?:, \d+ [^,]+){0,2})/,
            (result, [changed, summary]) => {
              const inserted = /(\d+) i/.exec(summary);
              const deleted = /(\d+) d/.exec(summary);
              result.changed = asNumber(changed);
              result.insertions = asNumber(inserted?.[1]);
              result.deletions = asNumber(deleted?.[1]);
            }
          )
        ];
        numStatParser = [
          new LineParser(
            /(\d+)\t(\d+)\t(.+)$/,
            (result, [changesInsert, changesDelete, file]) => {
              const insertions = asNumber(changesInsert);
              const deletions = asNumber(changesDelete);
              result.changed++;
              result.insertions += insertions;
              result.deletions += deletions;
              result.files.push({
                file,
                changes: insertions + deletions,
                insertions,
                deletions,
                binary: false
              });
            }
          ),
          new LineParser(/-\t-\t(.+)$/, (result, [file]) => {
            result.changed++;
            result.files.push({
              file,
              after: 0,
              before: 0,
              binary: true
            });
          })
        ];
        nameOnlyParser = [
          new LineParser(/(.+)$/, (result, [file]) => {
            result.changed++;
            result.files.push({
              file,
              changes: 0,
              insertions: 0,
              deletions: 0,
              binary: false
            });
          })
        ];
        nameStatusParser = [
          new LineParser(
            /([ACDMRTUXB])([0-9]{0,3})\t(.[^\t]*)(\t(.[^\t]*))?$/,
            (result, [status, similarity, from, _to, to]) => {
              result.changed++;
              result.files.push({
                file: to ?? from,
                changes: 0,
                insertions: 0,
                deletions: 0,
                binary: false,
                status: orVoid(isDiffNameStatus(status) && status),
                from: orVoid(!!to && from !== to && from),
                similarity: asNumber(similarity)
              });
            }
          )
        ];
        diffSummaryParsers = {
          [
            ""
            /* NONE */
          ]: statParser,
          [
            "--stat"
            /* STAT */
          ]: statParser,
          [
            "--numstat"
            /* NUM_STAT */
          ]: numStatParser,
          [
            "--name-status"
            /* NAME_STATUS */
          ]: nameStatusParser,
          [
            "--name-only"
            /* NAME_ONLY */
          ]: nameOnlyParser
        };
      }
    });
    init_parse_list_log_summary = __esm2({
      "src/lib/parsers/parse-list-log-summary.ts"() {
        "use strict";
        init_utils();
        init_parse_diff_summary();
        init_log_format();
        START_BOUNDARY = "\xF2\xF2\xF2\xF2\xF2\xF2 ";
        COMMIT_BOUNDARY = " \xF2\xF2";
        SPLITTER = " \xF2 ";
        defaultFieldNames = ["hash", "date", "message", "refs", "author_name", "author_email"];
      }
    });
    diff_exports = {};
    __export2(diff_exports, {
      diffSummaryTask: () => diffSummaryTask,
      validateLogFormatConfig: () => validateLogFormatConfig
    });
    init_diff = __esm2({
      "src/lib/tasks/diff.ts"() {
        "use strict";
        init_log_format();
        init_parse_diff_summary();
        init_task();
      }
    });
    init_log = __esm2({
      "src/lib/tasks/log.ts"() {
        "use strict";
        init_log_format();
        init_parse_list_log_summary();
        init_utils();
        init_task();
        init_diff();
        excludeOptions = /* @__PURE__ */ ((excludeOptions2) => {
          excludeOptions2[excludeOptions2["--pretty"] = 0] = "--pretty";
          excludeOptions2[excludeOptions2["max-count"] = 1] = "max-count";
          excludeOptions2[excludeOptions2["maxCount"] = 2] = "maxCount";
          excludeOptions2[excludeOptions2["n"] = 3] = "n";
          excludeOptions2[excludeOptions2["file"] = 4] = "file";
          excludeOptions2[excludeOptions2["format"] = 5] = "format";
          excludeOptions2[excludeOptions2["from"] = 6] = "from";
          excludeOptions2[excludeOptions2["to"] = 7] = "to";
          excludeOptions2[excludeOptions2["splitter"] = 8] = "splitter";
          excludeOptions2[excludeOptions2["symmetric"] = 9] = "symmetric";
          excludeOptions2[excludeOptions2["mailMap"] = 10] = "mailMap";
          excludeOptions2[excludeOptions2["multiLine"] = 11] = "multiLine";
          excludeOptions2[excludeOptions2["strictDate"] = 12] = "strictDate";
          return excludeOptions2;
        })(excludeOptions || {});
      }
    });
    init_MergeSummary = __esm2({
      "src/lib/responses/MergeSummary.ts"() {
        "use strict";
        MergeSummaryConflict = class {
          constructor(reason, file = null, meta) {
            this.reason = reason;
            this.file = file;
            this.meta = meta;
          }
          toString() {
            return `${this.file}:${this.reason}`;
          }
        };
        MergeSummaryDetail = class {
          constructor() {
            this.conflicts = [];
            this.merges = [];
            this.result = "success";
          }
          get failed() {
            return this.conflicts.length > 0;
          }
          get reason() {
            return this.result;
          }
          toString() {
            if (this.conflicts.length) {
              return `CONFLICTS: ${this.conflicts.join(", ")}`;
            }
            return "OK";
          }
        };
      }
    });
    init_PullSummary = __esm2({
      "src/lib/responses/PullSummary.ts"() {
        "use strict";
        PullSummary = class {
          constructor() {
            this.remoteMessages = {
              all: []
            };
            this.created = [];
            this.deleted = [];
            this.files = [];
            this.deletions = {};
            this.insertions = {};
            this.summary = {
              changes: 0,
              deletions: 0,
              insertions: 0
            };
          }
        };
        PullFailedSummary = class {
          constructor() {
            this.remote = "";
            this.hash = {
              local: "",
              remote: ""
            };
            this.branch = {
              local: "",
              remote: ""
            };
            this.message = "";
          }
          toString() {
            return this.message;
          }
        };
      }
    });
    init_parse_remote_objects = __esm2({
      "src/lib/parsers/parse-remote-objects.ts"() {
        "use strict";
        init_utils();
        remoteMessagesObjectParsers = [
          new RemoteLineParser(
            /^remote:\s*(enumerating|counting|compressing) objects: (\d+),/i,
            (result, [action, count]) => {
              const key = action.toLowerCase();
              const enumeration = objectEnumerationResult(result.remoteMessages);
              Object.assign(enumeration, { [key]: asNumber(count) });
            }
          ),
          new RemoteLineParser(
            /^remote:\s*(enumerating|counting|compressing) objects: \d+% \(\d+\/(\d+)\),/i,
            (result, [action, count]) => {
              const key = action.toLowerCase();
              const enumeration = objectEnumerationResult(result.remoteMessages);
              Object.assign(enumeration, { [key]: asNumber(count) });
            }
          ),
          new RemoteLineParser(
            /total ([^,]+), reused ([^,]+), pack-reused (\d+)/i,
            (result, [total, reused, packReused]) => {
              const objects = objectEnumerationResult(result.remoteMessages);
              objects.total = asObjectCount(total);
              objects.reused = asObjectCount(reused);
              objects.packReused = asNumber(packReused);
            }
          )
        ];
      }
    });
    init_parse_remote_messages = __esm2({
      "src/lib/parsers/parse-remote-messages.ts"() {
        "use strict";
        init_utils();
        init_parse_remote_objects();
        parsers2 = [
          new RemoteLineParser(/^remote:\s*(.+)$/, (result, [text]) => {
            result.remoteMessages.all.push(text.trim());
            return false;
          }),
          ...remoteMessagesObjectParsers,
          new RemoteLineParser(
            [/create a (?:pull|merge) request/i, /\s(https?:\/\/\S+)$/],
            (result, [pullRequestUrl]) => {
              result.remoteMessages.pullRequestUrl = pullRequestUrl;
            }
          ),
          new RemoteLineParser(
            [/found (\d+) vulnerabilities.+\(([^)]+)\)/i, /\s(https?:\/\/\S+)$/],
            (result, [count, summary, url]) => {
              result.remoteMessages.vulnerabilities = {
                count: asNumber(count),
                summary,
                url
              };
            }
          )
        ];
        RemoteMessageSummary = class {
          constructor() {
            this.all = [];
          }
        };
      }
    });
    init_parse_pull = __esm2({
      "src/lib/parsers/parse-pull.ts"() {
        "use strict";
        init_PullSummary();
        init_utils();
        init_parse_remote_messages();
        FILE_UPDATE_REGEX = /^\s*(.+?)\s+\|\s+\d+\s*(\+*)(-*)/;
        SUMMARY_REGEX = /(\d+)\D+((\d+)\D+\(\+\))?(\D+(\d+)\D+\(-\))?/;
        ACTION_REGEX = /^(create|delete) mode \d+ (.+)/;
        parsers3 = [
          new LineParser(FILE_UPDATE_REGEX, (result, [file, insertions, deletions]) => {
            result.files.push(file);
            if (insertions) {
              result.insertions[file] = insertions.length;
            }
            if (deletions) {
              result.deletions[file] = deletions.length;
            }
          }),
          new LineParser(SUMMARY_REGEX, (result, [changes, , insertions, , deletions]) => {
            if (insertions !== void 0 || deletions !== void 0) {
              result.summary.changes = +changes || 0;
              result.summary.insertions = +insertions || 0;
              result.summary.deletions = +deletions || 0;
              return true;
            }
            return false;
          }),
          new LineParser(ACTION_REGEX, (result, [action, file]) => {
            append(result.files, file);
            append(action === "create" ? result.created : result.deleted, file);
          })
        ];
        errorParsers = [
          new LineParser(/^from\s(.+)$/i, (result, [remote]) => void (result.remote = remote)),
          new LineParser(/^fatal:\s(.+)$/, (result, [message]) => void (result.message = message)),
          new LineParser(
            /([a-z0-9]+)\.\.([a-z0-9]+)\s+(\S+)\s+->\s+(\S+)$/,
            (result, [hashLocal, hashRemote, branchLocal, branchRemote]) => {
              result.branch.local = branchLocal;
              result.hash.local = hashLocal;
              result.branch.remote = branchRemote;
              result.hash.remote = hashRemote;
            }
          )
        ];
        parsePullDetail = (stdOut, stdErr) => {
          return parseStringResponse(new PullSummary(), parsers3, [stdOut, stdErr]);
        };
        parsePullResult = (stdOut, stdErr) => {
          return Object.assign(
            new PullSummary(),
            parsePullDetail(stdOut, stdErr),
            parseRemoteMessages(stdOut, stdErr)
          );
        };
      }
    });
    init_parse_merge = __esm2({
      "src/lib/parsers/parse-merge.ts"() {
        "use strict";
        init_MergeSummary();
        init_utils();
        init_parse_pull();
        parsers4 = [
          new LineParser(/^Auto-merging\s+(.+)$/, (summary, [autoMerge]) => {
            summary.merges.push(autoMerge);
          }),
          new LineParser(/^CONFLICT\s+\((.+)\): Merge conflict in (.+)$/, (summary, [reason, file]) => {
            summary.conflicts.push(new MergeSummaryConflict(reason, file));
          }),
          new LineParser(
            /^CONFLICT\s+\((.+\/delete)\): (.+) deleted in (.+) and/,
            (summary, [reason, file, deleteRef]) => {
              summary.conflicts.push(new MergeSummaryConflict(reason, file, { deleteRef }));
            }
          ),
          new LineParser(/^CONFLICT\s+\((.+)\):/, (summary, [reason]) => {
            summary.conflicts.push(new MergeSummaryConflict(reason, null));
          }),
          new LineParser(/^Automatic merge failed;\s+(.+)$/, (summary, [result]) => {
            summary.result = result;
          })
        ];
        parseMergeResult = (stdOut, stdErr) => {
          return Object.assign(parseMergeDetail(stdOut, stdErr), parsePullResult(stdOut, stdErr));
        };
        parseMergeDetail = (stdOut) => {
          return parseStringResponse(new MergeSummaryDetail(), parsers4, stdOut);
        };
      }
    });
    init_merge = __esm2({
      "src/lib/tasks/merge.ts"() {
        "use strict";
        init_git_response_error();
        init_parse_merge();
        init_task();
      }
    });
    init_parse_push = __esm2({
      "src/lib/parsers/parse-push.ts"() {
        "use strict";
        init_utils();
        init_parse_remote_messages();
        parsers5 = [
          new LineParser(/^Pushing to (.+)$/, (result, [repo]) => {
            result.repo = repo;
          }),
          new LineParser(/^updating local tracking ref '(.+)'/, (result, [local]) => {
            result.ref = {
              ...result.ref || {},
              local
            };
          }),
          new LineParser(/^[=*-]\s+([^:]+):(\S+)\s+\[(.+)]$/, (result, [local, remote, type]) => {
            result.pushed.push(pushResultPushedItem(local, remote, type));
          }),
          new LineParser(
            /^Branch '([^']+)' set up to track remote branch '([^']+)' from '([^']+)'/,
            (result, [local, remote, remoteName]) => {
              result.branch = {
                ...result.branch || {},
                local,
                remote,
                remoteName
              };
            }
          ),
          new LineParser(
            /^([^:]+):(\S+)\s+([a-z0-9]+)\.\.([a-z0-9]+)$/,
            (result, [local, remote, from, to]) => {
              result.update = {
                head: {
                  local,
                  remote
                },
                hash: {
                  from,
                  to
                }
              };
            }
          )
        ];
        parsePushResult = (stdOut, stdErr) => {
          const pushDetail = parsePushDetail(stdOut, stdErr);
          const responseDetail = parseRemoteMessages(stdOut, stdErr);
          return {
            ...pushDetail,
            ...responseDetail
          };
        };
        parsePushDetail = (stdOut, stdErr) => {
          return parseStringResponse({ pushed: [] }, parsers5, [stdOut, stdErr]);
        };
      }
    });
    push_exports = {};
    __export2(push_exports, {
      pushTagsTask: () => pushTagsTask,
      pushTask: () => pushTask
    });
    init_push = __esm2({
      "src/lib/tasks/push.ts"() {
        "use strict";
        init_parse_push();
        init_utils();
      }
    });
    init_show = __esm2({
      "src/lib/tasks/show.ts"() {
        "use strict";
        init_utils();
        init_task();
      }
    });
    init_FileStatusSummary = __esm2({
      "src/lib/responses/FileStatusSummary.ts"() {
        "use strict";
        fromPathRegex = /^(.+)\0(.+)$/;
        FileStatusSummary = class {
          constructor(path, index, working_dir) {
            this.path = path;
            this.index = index;
            this.working_dir = working_dir;
            if (index === "R" || working_dir === "R") {
              const detail = fromPathRegex.exec(path) || [null, path, path];
              this.from = detail[2] || "";
              this.path = detail[1] || "";
            }
          }
        };
      }
    });
    init_StatusSummary = __esm2({
      "src/lib/responses/StatusSummary.ts"() {
        "use strict";
        init_utils();
        init_FileStatusSummary();
        StatusSummary = class {
          constructor() {
            this.not_added = [];
            this.conflicted = [];
            this.created = [];
            this.deleted = [];
            this.ignored = void 0;
            this.modified = [];
            this.renamed = [];
            this.files = [];
            this.staged = [];
            this.ahead = 0;
            this.behind = 0;
            this.current = null;
            this.tracking = null;
            this.detached = false;
            this.isClean = () => {
              return !this.files.length;
            };
          }
        };
        parsers6 = new Map([
          parser3(
            " ",
            "A",
            (result, file) => result.created.push(file)
          ),
          parser3(
            " ",
            "D",
            (result, file) => result.deleted.push(file)
          ),
          parser3(
            " ",
            "M",
            (result, file) => result.modified.push(file)
          ),
          parser3("A", " ", (result, file) => {
            result.created.push(file);
            result.staged.push(file);
          }),
          parser3("A", "M", (result, file) => {
            result.created.push(file);
            result.staged.push(file);
            result.modified.push(file);
          }),
          parser3("D", " ", (result, file) => {
            result.deleted.push(file);
            result.staged.push(file);
          }),
          parser3("M", " ", (result, file) => {
            result.modified.push(file);
            result.staged.push(file);
          }),
          parser3("M", "M", (result, file) => {
            result.modified.push(file);
            result.staged.push(file);
          }),
          parser3("R", " ", (result, file) => {
            result.renamed.push(renamedFile(file));
          }),
          parser3("R", "M", (result, file) => {
            const renamed = renamedFile(file);
            result.renamed.push(renamed);
            result.modified.push(renamed.to);
          }),
          parser3("!", "!", (_result, _file) => {
            (_result.ignored = _result.ignored || []).push(_file);
          }),
          parser3(
            "?",
            "?",
            (result, file) => result.not_added.push(file)
          ),
          ...conflicts(
            "A",
            "A",
            "U"
            /* UNMERGED */
          ),
          ...conflicts(
            "D",
            "D",
            "U"
            /* UNMERGED */
          ),
          ...conflicts(
            "U",
            "A",
            "D",
            "U"
            /* UNMERGED */
          ),
          [
            "##",
            (result, line) => {
              const aheadReg = /ahead (\d+)/;
              const behindReg = /behind (\d+)/;
              const currentReg = /^(.+?(?=(?:\.{3}|\s|$)))/;
              const trackingReg = /\.{3}(\S*)/;
              const onEmptyBranchReg = /\son\s(\S+?)(?=\.{3}|$)/;
              let regexResult = aheadReg.exec(line);
              result.ahead = regexResult && +regexResult[1] || 0;
              regexResult = behindReg.exec(line);
              result.behind = regexResult && +regexResult[1] || 0;
              regexResult = currentReg.exec(line);
              result.current = filterType(regexResult?.[1], filterString, null);
              regexResult = trackingReg.exec(line);
              result.tracking = filterType(regexResult?.[1], filterString, null);
              regexResult = onEmptyBranchReg.exec(line);
              if (regexResult) {
                result.current = filterType(regexResult?.[1], filterString, result.current);
              }
              result.detached = /\(no branch\)/.test(line);
            }
          ]
        ]);
        parseStatusSummary = function(text) {
          const lines = text.split(NULL);
          const status = new StatusSummary();
          for (let i2 = 0, l = lines.length; i2 < l; ) {
            let line = lines[i2++].trim();
            if (!line) {
              continue;
            }
            if (line.charAt(0) === "R") {
              line += NULL + (lines[i2++] || "");
            }
            splitLine(status, line);
          }
          return status;
        };
      }
    });
    init_status = __esm2({
      "src/lib/tasks/status.ts"() {
        "use strict";
        init_StatusSummary();
        ignoredOptions = ["--null", "-z"];
      }
    });
    init_version = __esm2({
      "src/lib/tasks/version.ts"() {
        "use strict";
        init_utils();
        NOT_INSTALLED = "installed=false";
        parsers7 = [
          new LineParser(
            /version (\d+)\.(\d+)\.(\d+)(?:\s*\((.+)\))?/,
            (result, [major, minor, patch, agent = ""]) => {
              Object.assign(
                result,
                versionResponse(asNumber(major), asNumber(minor), asNumber(patch), agent)
              );
            }
          ),
          new LineParser(
            /version (\d+)\.(\d+)\.(\D+)(.+)?$/,
            (result, [major, minor, patch, agent = ""]) => {
              Object.assign(result, versionResponse(asNumber(major), asNumber(minor), patch, agent));
            }
          )
        ];
      }
    });
    init_clone = __esm2({
      "src/lib/tasks/clone.ts"() {
        "use strict";
        init_task();
        init_utils();
        cloneTask = (repo, directory, customArgs) => {
          const commands = ["clone", ...customArgs];
          filterString(repo) && commands.push(c(repo));
          filterString(directory) && commands.push(c(directory));
          return straightThroughStringTask(commands);
        };
        cloneMirrorTask = (repo, directory, customArgs) => {
          append(customArgs, "--mirror");
          return cloneTask(repo, directory, customArgs);
        };
      }
    });
    simple_git_api_exports = {};
    __export2(simple_git_api_exports, {
      SimpleGitApi: () => SimpleGitApi
    });
    init_simple_git_api = __esm2({
      "src/lib/simple-git-api.ts"() {
        "use strict";
        init_task_callback();
        init_change_working_directory();
        init_checkout();
        init_count_objects();
        init_commit();
        init_config();
        init_first_commit();
        init_grep();
        init_hash_object();
        init_init();
        init_log();
        init_merge();
        init_push();
        init_show();
        init_status();
        init_task();
        init_version();
        init_utils();
        init_clone();
        SimpleGitApi = class {
          constructor(_executor) {
            this._executor = _executor;
          }
          _runTask(task, then) {
            const chain = this._executor.chain();
            const promise = chain.push(task);
            if (then) {
              taskCallback(task, promise, then);
            }
            return Object.create(this, {
              then: { value: promise.then.bind(promise) },
              catch: { value: promise.catch.bind(promise) },
              _executor: { value: chain }
            });
          }
          add(files) {
            return this._runTask(
              straightThroughStringTask(["add", ...asArray(files)]),
              trailingFunctionArgument(arguments)
            );
          }
          cwd(directory) {
            const next = trailingFunctionArgument(arguments);
            if (typeof directory === "string") {
              return this._runTask(changeWorkingDirectoryTask(directory, this._executor), next);
            }
            if (typeof directory?.path === "string") {
              return this._runTask(
                changeWorkingDirectoryTask(
                  directory.path,
                  directory.root && this._executor || void 0
                ),
                next
              );
            }
            return this._runTask(
              configurationErrorTask("Git.cwd: workingDirectory must be supplied as a string"),
              next
            );
          }
          hashObject(path, write) {
            return this._runTask(
              hashObjectTask(path, write === true),
              trailingFunctionArgument(arguments)
            );
          }
          init(bare) {
            return this._runTask(
              initTask(bare === true, this._executor.cwd, getTrailingOptions(arguments)),
              trailingFunctionArgument(arguments)
            );
          }
          merge() {
            return this._runTask(
              mergeTask(getTrailingOptions(arguments)),
              trailingFunctionArgument(arguments)
            );
          }
          mergeFromTo(remote, branch) {
            if (!(filterString(remote) && filterString(branch))) {
              return this._runTask(
                configurationErrorTask(
                  `Git.mergeFromTo requires that the 'remote' and 'branch' arguments are supplied as strings`
                )
              );
            }
            return this._runTask(
              mergeTask([remote, branch, ...getTrailingOptions(arguments)]),
              trailingFunctionArgument(arguments, false)
            );
          }
          outputHandler(handler) {
            this._executor.outputHandler = handler;
            return this;
          }
          push() {
            const task = pushTask(
              {
                remote: filterType(arguments[0], filterString),
                branch: filterType(arguments[1], filterString)
              },
              getTrailingOptions(arguments)
            );
            return this._runTask(task, trailingFunctionArgument(arguments));
          }
          stash() {
            return this._runTask(
              straightThroughStringTask(["stash", ...getTrailingOptions(arguments)]),
              trailingFunctionArgument(arguments)
            );
          }
          status() {
            return this._runTask(
              statusTask(getTrailingOptions(arguments)),
              trailingFunctionArgument(arguments)
            );
          }
        };
        Object.assign(
          SimpleGitApi.prototype,
          checkout_default(),
          clone_default(),
          commit_default(),
          config_default(),
          count_objects_default(),
          first_commit_default(),
          grep_default(),
          log_default(),
          show_default(),
          version_default()
        );
      }
    });
    scheduler_exports = {};
    __export2(scheduler_exports, {
      Scheduler: () => Scheduler
    });
    init_scheduler = __esm2({
      "src/lib/runners/scheduler.ts"() {
        "use strict";
        init_utils();
        init_git_logger();
        createScheduledTask = /* @__PURE__ */ (() => {
          let id = 0;
          return () => {
            id++;
            const { promise, done } = (0, import_promise_deferred.createDeferred)();
            return {
              promise,
              done,
              id
            };
          };
        })();
        Scheduler = class {
          constructor(concurrency = 2) {
            this.concurrency = concurrency;
            this.logger = createLogger("", "scheduler");
            this.pending = [];
            this.running = [];
            this.logger(`Constructed, concurrency=%s`, concurrency);
          }
          schedule() {
            if (!this.pending.length || this.running.length >= this.concurrency) {
              this.logger(
                `Schedule attempt ignored, pending=%s running=%s concurrency=%s`,
                this.pending.length,
                this.running.length,
                this.concurrency
              );
              return;
            }
            const task = append(this.running, this.pending.shift());
            this.logger(`Attempting id=%s`, task.id);
            task.done(() => {
              this.logger(`Completing id=`, task.id);
              remove(this.running, task);
              this.schedule();
            });
          }
          next() {
            const { promise, id } = append(this.pending, createScheduledTask());
            this.logger(`Scheduling id=%s`, id);
            this.schedule();
            return promise;
          }
        };
      }
    });
    apply_patch_exports = {};
    __export2(apply_patch_exports, {
      applyPatchTask: () => applyPatchTask
    });
    init_apply_patch = __esm2({
      "src/lib/tasks/apply-patch.ts"() {
        "use strict";
        init_task();
      }
    });
    init_BranchDeleteSummary = __esm2({
      "src/lib/responses/BranchDeleteSummary.ts"() {
        "use strict";
        BranchDeletionBatch = class {
          constructor() {
            this.all = [];
            this.branches = {};
            this.errors = [];
          }
          get success() {
            return !this.errors.length;
          }
        };
      }
    });
    init_parse_branch_delete = __esm2({
      "src/lib/parsers/parse-branch-delete.ts"() {
        "use strict";
        init_BranchDeleteSummary();
        init_utils();
        deleteSuccessRegex = /(\S+)\s+\(\S+\s([^)]+)\)/;
        deleteErrorRegex = /^error[^']+'([^']+)'/m;
        parsers8 = [
          new LineParser(deleteSuccessRegex, (result, [branch, hash]) => {
            const deletion = branchDeletionSuccess(branch, hash);
            result.all.push(deletion);
            result.branches[branch] = deletion;
          }),
          new LineParser(deleteErrorRegex, (result, [branch]) => {
            const deletion = branchDeletionFailure(branch);
            result.errors.push(deletion);
            result.all.push(deletion);
            result.branches[branch] = deletion;
          })
        ];
        parseBranchDeletions = (stdOut, stdErr) => {
          return parseStringResponse(new BranchDeletionBatch(), parsers8, [stdOut, stdErr]);
        };
      }
    });
    init_BranchSummary = __esm2({
      "src/lib/responses/BranchSummary.ts"() {
        "use strict";
        BranchSummaryResult = class {
          constructor() {
            this.all = [];
            this.branches = {};
            this.current = "";
            this.detached = false;
          }
          push(status, detached, name, commit, label) {
            if (status === "*") {
              this.detached = detached;
              this.current = name;
            }
            this.all.push(name);
            this.branches[name] = {
              current: status === "*",
              linkedWorkTree: status === "+",
              name,
              commit,
              label
            };
          }
        };
      }
    });
    init_parse_branch = __esm2({
      "src/lib/parsers/parse-branch.ts"() {
        "use strict";
        init_BranchSummary();
        init_utils();
        parsers9 = [
          new LineParser(
            /^([*+]\s)?\((?:HEAD )?detached (?:from|at) (\S+)\)\s+([a-z0-9]+)\s(.*)$/,
            (result, [current, name, commit, label]) => {
              result.push(branchStatus(current), true, name, commit, label);
            }
          ),
          new LineParser(
            /^([*+]\s)?(\S+)\s+([a-z0-9]+)\s?(.*)$/s,
            (result, [current, name, commit, label]) => {
              result.push(branchStatus(current), false, name, commit, label);
            }
          )
        ];
        currentBranchParser = new LineParser(/^(\S+)$/s, (result, [name]) => {
          result.push("*", false, name, "", "");
        });
      }
    });
    branch_exports = {};
    __export2(branch_exports, {
      branchLocalTask: () => branchLocalTask,
      branchTask: () => branchTask,
      containsDeleteBranchCommand: () => containsDeleteBranchCommand,
      deleteBranchTask: () => deleteBranchTask,
      deleteBranchesTask: () => deleteBranchesTask
    });
    init_branch = __esm2({
      "src/lib/tasks/branch.ts"() {
        "use strict";
        init_git_response_error();
        init_parse_branch_delete();
        init_parse_branch();
        init_utils();
      }
    });
    init_CheckIgnore = __esm2({
      "src/lib/responses/CheckIgnore.ts"() {
        "use strict";
        parseCheckIgnore = (text) => {
          return text.split(/\n/g).map(toPath).filter(Boolean);
        };
      }
    });
    check_ignore_exports = {};
    __export2(check_ignore_exports, {
      checkIgnoreTask: () => checkIgnoreTask
    });
    init_check_ignore = __esm2({
      "src/lib/tasks/check-ignore.ts"() {
        "use strict";
        init_CheckIgnore();
      }
    });
    init_parse_fetch = __esm2({
      "src/lib/parsers/parse-fetch.ts"() {
        "use strict";
        init_utils();
        parsers10 = [
          new LineParser(/From (.+)$/, (result, [remote]) => {
            result.remote = remote;
          }),
          new LineParser(/\* \[new branch]\s+(\S+)\s*-> (.+)$/, (result, [name, tracking]) => {
            result.branches.push({
              name,
              tracking
            });
          }),
          new LineParser(/\* \[new tag]\s+(\S+)\s*-> (.+)$/, (result, [name, tracking]) => {
            result.tags.push({
              name,
              tracking
            });
          }),
          new LineParser(/- \[deleted]\s+\S+\s*-> (.+)$/, (result, [tracking]) => {
            result.deleted.push({
              tracking
            });
          }),
          new LineParser(
            /\s*([^.]+)\.\.(\S+)\s+(\S+)\s*-> (.+)$/,
            (result, [from, to, name, tracking]) => {
              result.updated.push({
                name,
                tracking,
                to,
                from
              });
            }
          )
        ];
      }
    });
    fetch_exports = {};
    __export2(fetch_exports, {
      fetchTask: () => fetchTask
    });
    init_fetch = __esm2({
      "src/lib/tasks/fetch.ts"() {
        "use strict";
        init_parse_fetch();
        init_task();
      }
    });
    init_parse_move = __esm2({
      "src/lib/parsers/parse-move.ts"() {
        "use strict";
        init_utils();
        parsers11 = [
          new LineParser(/^Renaming (.+) to (.+)$/, (result, [from, to]) => {
            result.moves.push({ from, to });
          })
        ];
      }
    });
    move_exports = {};
    __export2(move_exports, {
      moveTask: () => moveTask
    });
    init_move = __esm2({
      "src/lib/tasks/move.ts"() {
        "use strict";
        init_parse_move();
        init_utils();
      }
    });
    pull_exports = {};
    __export2(pull_exports, {
      pullTask: () => pullTask
    });
    init_pull = __esm2({
      "src/lib/tasks/pull.ts"() {
        "use strict";
        init_git_response_error();
        init_parse_pull();
        init_utils();
      }
    });
    init_GetRemoteSummary = __esm2({
      "src/lib/responses/GetRemoteSummary.ts"() {
        "use strict";
        init_utils();
      }
    });
    remote_exports = {};
    __export2(remote_exports, {
      addRemoteTask: () => addRemoteTask,
      getRemotesTask: () => getRemotesTask,
      listRemotesTask: () => listRemotesTask,
      remoteTask: () => remoteTask,
      removeRemoteTask: () => removeRemoteTask
    });
    init_remote = __esm2({
      "src/lib/tasks/remote.ts"() {
        "use strict";
        init_GetRemoteSummary();
        init_task();
      }
    });
    stash_list_exports = {};
    __export2(stash_list_exports, {
      stashListTask: () => stashListTask
    });
    init_stash_list = __esm2({
      "src/lib/tasks/stash-list.ts"() {
        "use strict";
        init_log_format();
        init_parse_list_log_summary();
        init_diff();
        init_log();
      }
    });
    sub_module_exports = {};
    __export2(sub_module_exports, {
      addSubModuleTask: () => addSubModuleTask,
      initSubModuleTask: () => initSubModuleTask,
      subModuleTask: () => subModuleTask,
      updateSubModuleTask: () => updateSubModuleTask
    });
    init_sub_module = __esm2({
      "src/lib/tasks/sub-module.ts"() {
        "use strict";
        init_task();
      }
    });
    init_TagList = __esm2({
      "src/lib/responses/TagList.ts"() {
        "use strict";
        TagList = class {
          constructor(all, latest) {
            this.all = all;
            this.latest = latest;
          }
        };
        parseTagList = function(data, customSort = false) {
          const tags = data.split("\n").map(trimmed).filter(Boolean);
          if (!customSort) {
            tags.sort(function(tagA, tagB) {
              const partsA = tagA.split(".");
              const partsB = tagB.split(".");
              if (partsA.length === 1 || partsB.length === 1) {
                return singleSorted(toNumber(partsA[0]), toNumber(partsB[0]));
              }
              for (let i2 = 0, l = Math.max(partsA.length, partsB.length); i2 < l; i2++) {
                const diff = sorted(toNumber(partsA[i2]), toNumber(partsB[i2]));
                if (diff) {
                  return diff;
                }
              }
              return 0;
            });
          }
          const latest = customSort ? tags[0] : [...tags].reverse().find((tag) => tag.indexOf(".") >= 0);
          return new TagList(tags, latest);
        };
      }
    });
    tag_exports = {};
    __export2(tag_exports, {
      addAnnotatedTagTask: () => addAnnotatedTagTask,
      addTagTask: () => addTagTask,
      tagListTask: () => tagListTask
    });
    init_tag = __esm2({
      "src/lib/tasks/tag.ts"() {
        "use strict";
        init_TagList();
      }
    });
    require_git = __commonJS2({
      "src/git.js"(exports, module) {
        "use strict";
        var { GitExecutor: GitExecutor2 } = (init_git_executor(), __toCommonJS(git_executor_exports));
        var { SimpleGitApi: SimpleGitApi2 } = (init_simple_git_api(), __toCommonJS(simple_git_api_exports));
        var { Scheduler: Scheduler2 } = (init_scheduler(), __toCommonJS(scheduler_exports));
        var { adhocExecTask: adhocExecTask2, configurationErrorTask: configurationErrorTask2 } = (init_task(), __toCommonJS(task_exports));
        var {
          asArray: asArray2,
          filterArray: filterArray2,
          filterPrimitives: filterPrimitives2,
          filterString: filterString2,
          filterStringOrStringArray: filterStringOrStringArray2,
          filterType: filterType2,
          getTrailingOptions: getTrailingOptions2,
          trailingFunctionArgument: trailingFunctionArgument2,
          trailingOptionsArgument: trailingOptionsArgument2
        } = (init_utils(), __toCommonJS(utils_exports));
        var { applyPatchTask: applyPatchTask2 } = (init_apply_patch(), __toCommonJS(apply_patch_exports));
        var {
          branchTask: branchTask2,
          branchLocalTask: branchLocalTask2,
          deleteBranchesTask: deleteBranchesTask2,
          deleteBranchTask: deleteBranchTask2
        } = (init_branch(), __toCommonJS(branch_exports));
        var { checkIgnoreTask: checkIgnoreTask2 } = (init_check_ignore(), __toCommonJS(check_ignore_exports));
        var { checkIsRepoTask: checkIsRepoTask2 } = (init_check_is_repo(), __toCommonJS(check_is_repo_exports));
        var { cleanWithOptionsTask: cleanWithOptionsTask2, isCleanOptionsArray: isCleanOptionsArray2 } = (init_clean(), __toCommonJS(clean_exports));
        var { diffSummaryTask: diffSummaryTask2 } = (init_diff(), __toCommonJS(diff_exports));
        var { fetchTask: fetchTask2 } = (init_fetch(), __toCommonJS(fetch_exports));
        var { moveTask: moveTask2 } = (init_move(), __toCommonJS(move_exports));
        var { pullTask: pullTask2 } = (init_pull(), __toCommonJS(pull_exports));
        var { pushTagsTask: pushTagsTask2 } = (init_push(), __toCommonJS(push_exports));
        var {
          addRemoteTask: addRemoteTask2,
          getRemotesTask: getRemotesTask2,
          listRemotesTask: listRemotesTask2,
          remoteTask: remoteTask2,
          removeRemoteTask: removeRemoteTask2
        } = (init_remote(), __toCommonJS(remote_exports));
        var { getResetMode: getResetMode2, resetTask: resetTask2 } = (init_reset(), __toCommonJS(reset_exports));
        var { stashListTask: stashListTask2 } = (init_stash_list(), __toCommonJS(stash_list_exports));
        var {
          addSubModuleTask: addSubModuleTask2,
          initSubModuleTask: initSubModuleTask2,
          subModuleTask: subModuleTask2,
          updateSubModuleTask: updateSubModuleTask2
        } = (init_sub_module(), __toCommonJS(sub_module_exports));
        var { addAnnotatedTagTask: addAnnotatedTagTask2, addTagTask: addTagTask2, tagListTask: tagListTask2 } = (init_tag(), __toCommonJS(tag_exports));
        var { straightThroughBufferTask: straightThroughBufferTask2, straightThroughStringTask: straightThroughStringTask2 } = (init_task(), __toCommonJS(task_exports));
        function Git2(options, plugins) {
          this._plugins = plugins;
          this._executor = new GitExecutor2(
            options.baseDir,
            new Scheduler2(options.maxConcurrentProcesses),
            plugins
          );
          this._trimmed = options.trimmed;
        }
        (Git2.prototype = Object.create(SimpleGitApi2.prototype)).constructor = Git2;
        Git2.prototype.customBinary = function(command) {
          this._plugins.reconfigure("binary", command);
          return this;
        };
        Git2.prototype.env = function(name, value) {
          if (arguments.length === 1 && typeof name === "object") {
            this._executor.env = name;
          } else {
            (this._executor.env = this._executor.env || {})[name] = value;
          }
          return this;
        };
        Git2.prototype.stashList = function(options) {
          return this._runTask(
            stashListTask2(
              trailingOptionsArgument2(arguments) || {},
              filterArray2(options) && options || []
            ),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.mv = function(from, to) {
          return this._runTask(moveTask2(from, to), trailingFunctionArgument2(arguments));
        };
        Git2.prototype.checkoutLatestTag = function(then) {
          var git = this;
          return this.pull(function() {
            git.tags(function(err, tags) {
              git.checkout(tags.latest, then);
            });
          });
        };
        Git2.prototype.pull = function(remote, branch, options, then) {
          return this._runTask(
            pullTask2(
              filterType2(remote, filterString2),
              filterType2(branch, filterString2),
              getTrailingOptions2(arguments)
            ),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.fetch = function(remote, branch) {
          return this._runTask(
            fetchTask2(
              filterType2(remote, filterString2),
              filterType2(branch, filterString2),
              getTrailingOptions2(arguments)
            ),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.silent = function(silence) {
          return this._runTask(
            adhocExecTask2(
              () => console.warn(
                "simple-git deprecation notice: git.silent: logging should be configured using the `debug` library / `DEBUG` environment variable, this method will be removed."
              )
            )
          );
        };
        Git2.prototype.tags = function(options, then) {
          return this._runTask(
            tagListTask2(getTrailingOptions2(arguments)),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.rebase = function() {
          return this._runTask(
            straightThroughStringTask2(["rebase", ...getTrailingOptions2(arguments)]),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.reset = function(mode) {
          return this._runTask(
            resetTask2(getResetMode2(mode), getTrailingOptions2(arguments)),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.revert = function(commit) {
          const next = trailingFunctionArgument2(arguments);
          if (typeof commit !== "string") {
            return this._runTask(configurationErrorTask2("Commit must be a string"), next);
          }
          return this._runTask(
            straightThroughStringTask2(["revert", ...getTrailingOptions2(arguments, 0, true), commit]),
            next
          );
        };
        Git2.prototype.addTag = function(name) {
          const task = typeof name === "string" ? addTagTask2(name) : configurationErrorTask2("Git.addTag requires a tag name");
          return this._runTask(task, trailingFunctionArgument2(arguments));
        };
        Git2.prototype.addAnnotatedTag = function(tagName, tagMessage) {
          return this._runTask(
            addAnnotatedTagTask2(tagName, tagMessage),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.deleteLocalBranch = function(branchName, forceDelete, then) {
          return this._runTask(
            deleteBranchTask2(branchName, typeof forceDelete === "boolean" ? forceDelete : false),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.deleteLocalBranches = function(branchNames, forceDelete, then) {
          return this._runTask(
            deleteBranchesTask2(branchNames, typeof forceDelete === "boolean" ? forceDelete : false),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.branch = function(options, then) {
          return this._runTask(
            branchTask2(getTrailingOptions2(arguments)),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.branchLocal = function(then) {
          return this._runTask(branchLocalTask2(), trailingFunctionArgument2(arguments));
        };
        Git2.prototype.raw = function(commands) {
          const createRestCommands = !Array.isArray(commands);
          const command = [].slice.call(createRestCommands ? arguments : commands, 0);
          for (let i2 = 0; i2 < command.length && createRestCommands; i2++) {
            if (!filterPrimitives2(command[i2])) {
              command.splice(i2, command.length - i2);
              break;
            }
          }
          command.push(...getTrailingOptions2(arguments, 0, true));
          var next = trailingFunctionArgument2(arguments);
          if (!command.length) {
            return this._runTask(
              configurationErrorTask2("Raw: must supply one or more command to execute"),
              next
            );
          }
          return this._runTask(straightThroughStringTask2(command, this._trimmed), next);
        };
        Git2.prototype.submoduleAdd = function(repo, path, then) {
          return this._runTask(addSubModuleTask2(repo, path), trailingFunctionArgument2(arguments));
        };
        Git2.prototype.submoduleUpdate = function(args, then) {
          return this._runTask(
            updateSubModuleTask2(getTrailingOptions2(arguments, true)),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.submoduleInit = function(args, then) {
          return this._runTask(
            initSubModuleTask2(getTrailingOptions2(arguments, true)),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.subModule = function(options, then) {
          return this._runTask(
            subModuleTask2(getTrailingOptions2(arguments)),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.listRemote = function() {
          return this._runTask(
            listRemotesTask2(getTrailingOptions2(arguments)),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.addRemote = function(remoteName, remoteRepo, then) {
          return this._runTask(
            addRemoteTask2(remoteName, remoteRepo, getTrailingOptions2(arguments)),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.removeRemote = function(remoteName, then) {
          return this._runTask(removeRemoteTask2(remoteName), trailingFunctionArgument2(arguments));
        };
        Git2.prototype.getRemotes = function(verbose, then) {
          return this._runTask(getRemotesTask2(verbose === true), trailingFunctionArgument2(arguments));
        };
        Git2.prototype.remote = function(options, then) {
          return this._runTask(
            remoteTask2(getTrailingOptions2(arguments)),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.tag = function(options, then) {
          const command = getTrailingOptions2(arguments);
          if (command[0] !== "tag") {
            command.unshift("tag");
          }
          return this._runTask(straightThroughStringTask2(command), trailingFunctionArgument2(arguments));
        };
        Git2.prototype.updateServerInfo = function(then) {
          return this._runTask(
            straightThroughStringTask2(["update-server-info"]),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.pushTags = function(remote, then) {
          const task = pushTagsTask2(
            { remote: filterType2(remote, filterString2) },
            getTrailingOptions2(arguments)
          );
          return this._runTask(task, trailingFunctionArgument2(arguments));
        };
        Git2.prototype.rm = function(files) {
          return this._runTask(
            straightThroughStringTask2(["rm", "-f", ...asArray2(files)]),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.rmKeepLocal = function(files) {
          return this._runTask(
            straightThroughStringTask2(["rm", "--cached", ...asArray2(files)]),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.catFile = function(options, then) {
          return this._catFile("utf-8", arguments);
        };
        Git2.prototype.binaryCatFile = function() {
          return this._catFile("buffer", arguments);
        };
        Git2.prototype._catFile = function(format, args) {
          var handler = trailingFunctionArgument2(args);
          var command = ["cat-file"];
          var options = args[0];
          if (typeof options === "string") {
            return this._runTask(
              configurationErrorTask2("Git.catFile: options must be supplied as an array of strings"),
              handler
            );
          }
          if (Array.isArray(options)) {
            command.push.apply(command, options);
          }
          const task = format === "buffer" ? straightThroughBufferTask2(command) : straightThroughStringTask2(command);
          return this._runTask(task, handler);
        };
        Git2.prototype.diff = function(options, then) {
          const task = filterString2(options) ? configurationErrorTask2(
            "git.diff: supplying options as a single string is no longer supported, switch to an array of strings"
          ) : straightThroughStringTask2(["diff", ...getTrailingOptions2(arguments)]);
          return this._runTask(task, trailingFunctionArgument2(arguments));
        };
        Git2.prototype.diffSummary = function() {
          return this._runTask(
            diffSummaryTask2(getTrailingOptions2(arguments, 1)),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.applyPatch = function(patches) {
          const task = !filterStringOrStringArray2(patches) ? configurationErrorTask2(
            `git.applyPatch requires one or more string patches as the first argument`
          ) : applyPatchTask2(asArray2(patches), getTrailingOptions2([].slice.call(arguments, 1)));
          return this._runTask(task, trailingFunctionArgument2(arguments));
        };
        Git2.prototype.revparse = function() {
          const commands = ["rev-parse", ...getTrailingOptions2(arguments, true)];
          return this._runTask(
            straightThroughStringTask2(commands, true),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.clean = function(mode, options, then) {
          const usingCleanOptionsArray = isCleanOptionsArray2(mode);
          const cleanMode = usingCleanOptionsArray && mode.join("") || filterType2(mode, filterString2) || "";
          const customArgs = getTrailingOptions2([].slice.call(arguments, usingCleanOptionsArray ? 1 : 0));
          return this._runTask(
            cleanWithOptionsTask2(cleanMode, customArgs),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.exec = function(then) {
          const task = {
            commands: [],
            format: "utf-8",
            parser() {
              if (typeof then === "function") {
                then();
              }
            }
          };
          return this._runTask(task);
        };
        Git2.prototype.clearQueue = function() {
          return this._runTask(
            adhocExecTask2(
              () => console.warn(
                "simple-git deprecation notice: clearQueue() is deprecated and will be removed, switch to using the abortPlugin instead."
              )
            )
          );
        };
        Git2.prototype.checkIgnore = function(pathnames, then) {
          return this._runTask(
            checkIgnoreTask2(asArray2(filterType2(pathnames, filterStringOrStringArray2, []))),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.checkIsRepo = function(checkType, then) {
          return this._runTask(
            checkIsRepoTask2(filterType2(checkType, filterString2)),
            trailingFunctionArgument2(arguments)
          );
        };
        module.exports = Git2;
      }
    });
    init_git_error();
    GitConstructError = class extends GitError {
      constructor(config, message) {
        super(void 0, message);
        this.config = config;
      }
    };
    init_git_error();
    init_git_error();
    GitPluginError = class extends GitError {
      constructor(task, plugin, message) {
        super(task, message);
        this.task = task;
        this.plugin = plugin;
        Object.setPrototypeOf(this, new.target.prototype);
      }
    };
    init_git_response_error();
    init_task_configuration_error();
    init_check_is_repo();
    init_clean();
    init_config();
    init_diff_name_status();
    init_grep();
    init_reset();
    init_utils();
    init_utils();
    never = (0, import_promise_deferred2.deferred)().promise;
    init_utils();
    WRONG_NUMBER_ERR = `Invalid value supplied for custom binary, requires a single string or an array containing either one or two strings`;
    WRONG_CHARS_ERR = `Invalid value supplied for custom binary, restricted characters must be removed or supply the unsafe.allowUnsafeCustomBinary option`;
    init_git_error();
    init_utils();
    PluginStore = class {
      constructor() {
        this.plugins = /* @__PURE__ */ new Set();
        this.events = new EventEmitter();
      }
      on(type, listener) {
        this.events.on(type, listener);
      }
      reconfigure(type, data) {
        this.events.emit(type, data);
      }
      append(type, action) {
        const plugin = append(this.plugins, { type, action });
        return () => this.plugins.delete(plugin);
      }
      add(plugin) {
        const plugins = [];
        asArray(plugin).forEach((plugin2) => plugin2 && this.plugins.add(append(plugins, plugin2)));
        return () => {
          plugins.forEach((plugin2) => this.plugins.delete(plugin2));
        };
      }
      exec(type, data, context) {
        let output = data;
        const contextual = Object.freeze(Object.create(context));
        for (const plugin of this.plugins) {
          if (plugin.type === type) {
            output = plugin.action(output, contextual);
          }
        }
        return output;
      }
    };
    init_utils();
    init_utils();
    init_utils();
    Git = require_git();
    init_git_response_error();
    simpleGit = gitInstanceFactory;
  }
});

// src/_shared/git-ops.ts
import { existsSync as existsSync5, mkdirSync as mkdirSync3, readdirSync } from "node:fs";
import { homedir as homedir2 } from "node:os";
import { join as join6, resolve } from "node:path";
import { spawn as spawn2 } from "node:child_process";
function expandHome(p2) {
  if (p2 === "~") return homedir2();
  if (p2.startsWith("~/")) return join6(homedir2(), p2.slice(2));
  return p2;
}
function cloneWithProgress(repoUrl, dest) {
  return new Promise((resolve9, reject) => {
    const env2 = { ...process.env };
    if (!process.stdin.isTTY) env2.GIT_TERMINAL_PROMPT = "0";
    const p2 = spawn2("git", ["clone", "--progress", repoUrl, dest], {
      stdio: "inherit",
      env: env2
    });
    p2.on("error", reject);
    p2.on("close", (code) => {
      if (code === 0) resolve9();
      else reject(new Error(`git clone exited with code ${code}. If this is an HTTPS URL needing auth, prefer SSH (git@github.com:...) or store a PAT via 'git config credential.helper'.`));
    });
  });
}
async function materializeRepoAtPath(localPath, repoUrl) {
  const path = resolve(expandHome(localPath));
  if (!existsSync5(path)) {
    mkdirSync3(path, { recursive: true });
    await cloneWithProgress(repoUrl, path);
    return { kind: "cloned" };
  }
  const entries = readdirSync(path);
  if (entries.length === 0) {
    await cloneWithProgress(repoUrl, path);
    return { kind: "cloned" };
  }
  if (entries.includes(".git")) {
    const git = simpleGit(path);
    let remote = "";
    try {
      remote = (await git.getConfig("remote.origin.url")).value ?? "";
    } catch {
    }
    return { kind: "existing", existingRemote: remote };
  }
  throw new Error(
    `${path} is not empty and is not a git repo. Pick another path or empty this one first.`
  );
}
async function ensureRepo(localPath, repoUrl) {
  await materializeRepoAtPath(localPath, repoUrl);
  const git = simpleGit(localPath);
  if (!existsSync5(join6(localPath, ".git"))) {
    await git.init();
    await git.addRemote("origin", repoUrl).catch(() => {
    });
  }
  return git;
}
async function ensureDeviceBranch(git, branch) {
  const local = await git.branchLocal();
  if (local.all.includes(branch)) {
    if (local.current !== branch) await git.checkout(branch);
    return;
  }
  let remoteHas = false;
  try {
    const remote = await git.branch(["-r"]);
    remoteHas = remote.all.includes(`origin/${branch}`);
  } catch {
  }
  if (remoteHas) {
    await git.checkout(["-b", branch, "--track", `origin/${branch}`]);
    return;
  }
  await git.checkout(["--orphan", branch]);
  await git.raw(["rm", "-rf", "--cached", "--ignore-unmatch", "."]);
}
function pushWithProgress(cwd, branch) {
  return new Promise((resolve9) => {
    const errBuf = [];
    let bufLen = 0;
    const p2 = spawn2(
      "git",
      ["push", "--progress", "--set-upstream", "origin", branch],
      { cwd, stdio: ["ignore", "inherit", "pipe"] }
    );
    p2.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
      const s = chunk.toString();
      errBuf.push(s);
      bufLen += s.length;
      if (bufLen > 8192) {
        const drop = errBuf.shift();
        if (drop) bufLen -= drop.length;
      }
    });
    p2.on("error", () => resolve9({ ok: false, secretBlocked: false, stderrTail: errBuf.join("") }));
    p2.on("close", (code) => {
      const tail = errBuf.join("");
      resolve9({
        ok: code === 0,
        secretBlocked: code !== 0 && SECRET_BLOCK_RE.test(tail),
        stderrTail: tail.slice(-4096)
      });
    });
  });
}
async function commitAndPush(git, message, paths, branch, onProgress) {
  if (paths.length === 0) return { committed: false, pushed: false };
  onProgress?.(`git add (${paths.length} paths)...`);
  await git.add(paths);
  const status = await git.status();
  if (status.staged.length === 0) return { committed: false, pushed: false };
  onProgress?.(`git commit (${status.staged.length} staged)...`);
  await git.commit(message);
  onProgress?.(`git push origin ${branch} (live progress below):`);
  const cwd = await git.revparse(["--show-toplevel"]).then((s) => s.trim());
  const r2 = await pushWithProgress(cwd, branch);
  return { committed: true, pushed: r2.ok, pushResult: r2 };
}
async function fastForwardBranch(git, branch, onProgress) {
  let hasRemote = false;
  try {
    const remotes = await git.getRemotes(false);
    hasRemote = remotes.some((r2) => r2.name === "origin");
  } catch {
  }
  if (!hasRemote) return { pulled: false, reason: "no-remote" };
  onProgress?.(`git fetch origin...`);
  try {
    await git.fetch("origin", branch);
  } catch {
  }
  let hasUpstream = false;
  try {
    const refs = await git.branch(["-r"]);
    hasUpstream = refs.all.includes(`origin/${branch}`);
  } catch {
  }
  if (!hasUpstream) return { pulled: false, reason: "no-tracking" };
  onProgress?.(`git pull --rebase --autostash origin ${branch}...`);
  try {
    await git.raw(["pull", "--rebase", "--autostash", "origin", branch]);
    return { pulled: true };
  } catch (err) {
    try {
      await git.raw(["rebase", "--abort"]);
    } catch {
    }
    try {
      await git.raw(["stash", "pop"]);
    } catch {
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Could not fast-forward / rebase '${branch}' onto origin/${branch}. Resolve manually in the repo, then re-run. Original error:
${msg}`
    );
  }
}
async function ensureLocalRepo(localPath) {
  const path = resolve(expandHome(localPath));
  let initialized = false;
  if (!existsSync5(join6(path, ".git"))) {
    mkdirSync3(path, { recursive: true });
    const g = simpleGit(path);
    await g.init();
    const hasIdentity = await g.raw(["config", "user.email"]).then((s) => s.trim().length > 0).catch(() => false);
    if (!hasIdentity) {
      await g.addConfig("user.email", "vibebook@localhost");
      await g.addConfig("user.name", "vibebook");
    }
    initialized = true;
  }
  return { git: simpleGit(path), initialized, path };
}
async function commitWhitelist(git, repoPath, message, candidatePaths, opts, onProgress) {
  const existing = candidatePaths.filter((p2) => existsSync5(join6(repoPath, p2)));
  if (existing.length === 0) return { committed: false, pushed: false, staged: 0, branch: opts.branch };
  onProgress?.(`git add (${existing.length} whitelist paths)...`);
  await git.add(existing);
  const status = await git.status();
  const underWhitelist = (f) => existing.some((w) => {
    const ww = w.replace(/\/+$/, "");
    return f === ww || f.startsWith(ww + "/");
  });
  const stagedWhitelist = status.staged.filter(underWhitelist);
  if (stagedWhitelist.length === 0) return { committed: false, pushed: false, staged: 0, branch: opts.branch };
  onProgress?.(`git commit (${stagedWhitelist.length} whitelist paths)...`);
  await git.commit(message, existing);
  const staged = stagedWhitelist.length;
  if (!opts.push) return { committed: true, pushed: false, staged, branch: opts.branch };
  try {
    await fastForwardBranch(git, opts.branch, onProgress);
  } catch (e) {
    onProgress?.(`push skipped (could not sync): ${e.message}`);
    return { committed: true, pushed: false, staged, branch: opts.branch };
  }
  const cwd = await git.revparse(["--show-toplevel"]).then((s) => s.trim());
  const r2 = await pushWithProgress(cwd, opts.branch);
  return { committed: true, pushed: r2.ok, staged, branch: opts.branch };
}
var SECRET_BLOCK_RE;
var init_git_ops = __esm({
  "src/_shared/git-ops.ts"() {
    "use strict";
    init_esm();
    SECRET_BLOCK_RE = /GH013|push protection|secret-scanning/i;
  }
});

// src/digest/book-catalog.ts
import { mkdirSync as mkdirSync4, writeFileSync as writeFileSync3 } from "node:fs";
import { join as join7, dirname } from "node:path";
function generateBookCatalog(repoRoot, idx) {
  const written = [];
  const chroniclesByProject = bucketBy(Object.values(idx.chronicles), (c3) => c3.project);
  const topicsByProject = bucketBy(Object.values(idx.topics), (t2) => t2.project);
  const cardsByProject = bucketBy(Object.values(idx.cards), (c3) => c3.project);
  const projectSet = /* @__PURE__ */ new Set();
  for (const p2 of chroniclesByProject.keys()) projectSet.add(p2);
  for (const p2 of topicsByProject.keys()) projectSet.add(p2);
  for (const p2 of cardsByProject.keys()) projectSet.add(p2);
  const projects = [...projectSet].sort((a, b2) => {
    if (a === "_global") return 1;
    if (b2 === "_global") return -1;
    return a.localeCompare(b2);
  });
  const frontPath = "book/index.md";
  writeRel(repoRoot, frontPath, renderFront({
    projects,
    chroniclesByProject,
    topicsByProject,
    cardsByProject,
    latestUpdate: latestUpdate(idx)
  }));
  written.push(frontPath);
  const timelinePath = "book/_meta/timeline.md";
  writeRel(repoRoot, timelinePath, renderTimeline(idx));
  written.push(timelinePath);
  for (const p2 of projects) {
    const path = `book/${p2}/index.md`;
    writeRel(repoRoot, path, renderProjectIndex(p2, {
      chronicles: chroniclesByProject.get(p2) ?? [],
      topics: topicsByProject.get(p2) ?? [],
      cards: cardsByProject.get(p2) ?? []
    }));
    written.push(path);
  }
  return { written };
}
function renderFront(args) {
  const totalChronicles = sumMapSizes(args.chroniclesByProject, (c3) => !c3.skip);
  const totalTopics = sumMapSizes(args.topicsByProject);
  const totalCards = sumMapSizes(args.cardsByProject);
  const lines = [];
  lines.push("---");
  lines.push("title: vibebook");
  lines.push(`updated: ${args.latestUpdate}`);
  lines.push("---");
  lines.push("");
  lines.push("# vibebook");
  lines.push("");
  lines.push(
    `Updated **${args.latestUpdate}** \xB7 ${args.projects.length} projects \xB7 ${totalChronicles} chronicles \xB7 ${totalTopics} topics \xB7 ${totalCards} cards`
  );
  lines.push("");
  lines.push("> Generated by `/vibebook` skill. Don't edit by hand \u2014 re-runs overwrite.");
  lines.push("");
  lines.push("## Projects");
  lines.push("");
  for (const p2 of args.projects) {
    const chrs = (args.chroniclesByProject.get(p2) ?? []).filter((c3) => !c3.skip);
    const tops = args.topicsByProject.get(p2) ?? [];
    const crds = args.cardsByProject.get(p2) ?? [];
    if (chrs.length === 0 && tops.length === 0 && crds.length === 0) continue;
    const lastActive = projectLastActive(chrs, tops, crds);
    lines.push(`### ${p2}`);
    lines.push(`Last active: ${lastActive}`);
    lines.push("");
    if (chrs.length > 0) {
      lines.push(`**${chrs.length} chronicle${chrs.length === 1 ? "" : "s"}** \u2014 most recent:`);
      for (const c3 of recent(chrs, 3)) {
        lines.push(`  - [${c3.title}](${c3.path}) \u2014 ${c3.updatedAt}`);
      }
    }
    if (tops.length > 0) {
      lines.push(`**${tops.length} topic${tops.length === 1 ? "" : "s"}**: ${tops.map((t2) => `[${t2.topicSlug}](${t2.path})`).join(", ")}`);
    }
    if (crds.length > 0) {
      const byType = bucketBy(crds, (c3) => c3.type);
      const breakdown = [...byType.entries()].sort().map(([type, list]) => `${list.length} ${type}`).join(" / ");
      lines.push(`**${crds.length} card${crds.length === 1 ? "" : "s"}**: ${breakdown}`);
    }
    lines.push("");
  }
  lines.push("---");
  lines.push("");
  lines.push("- [Global timeline](_meta/timeline.md)");
  lines.push("");
  return lines.join("\n");
}
function renderTimeline(idx) {
  const events = [];
  for (const c3 of Object.values(idx.chronicles)) {
    if (c3.skip) continue;
    events.push({
      date: c3.updatedAt.slice(0, 10),
      ts: c3.updatedAt,
      line: `\u{1F4DD} [${c3.title}](../${c3.path}) \u2014 _${c3.project}_ chronicle`
    });
  }
  for (const t2 of Object.values(idx.topics)) {
    events.push({
      date: t2.updatedAt.slice(0, 10),
      ts: t2.updatedAt,
      line: `\u{1F4DA} [${t2.topicSlug}](../${t2.path}) \u2014 _${t2.project}_ topic updated`
    });
  }
  for (const c3 of Object.values(idx.cards)) {
    events.push({
      date: c3.updatedAt.slice(0, 10),
      ts: c3.updatedAt,
      line: `\u{1F4A1} [${c3.cardSlug}](../${c3.path}) \u2014 _${c3.project}_ ${c3.type} card`
    });
  }
  events.sort((a, b2) => a.ts < b2.ts ? 1 : a.ts > b2.ts ? -1 : 0);
  const lines = [];
  lines.push("# Global timeline");
  lines.push("");
  lines.push("Newest first across every project.");
  lines.push("");
  let lastDate = "";
  for (const e of events) {
    if (e.date !== lastDate) {
      lines.push("");
      lines.push(`## ${e.date}`);
      lines.push("");
      lastDate = e.date;
    }
    lines.push(`- ${e.line}`);
  }
  lines.push("");
  return lines.join("\n");
}
function renderProjectIndex(project, args) {
  const chrs = args.chronicles.filter((c3) => !c3.skip);
  const lines = [];
  lines.push("---");
  lines.push(`title: ${project}`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${project}`);
  lines.push("");
  lines.push(`${chrs.length} chronicle${chrs.length === 1 ? "" : "s"} \xB7 ${args.topics.length} topic${args.topics.length === 1 ? "" : "s"} \xB7 ${args.cards.length} card${args.cards.length === 1 ? "" : "s"}`);
  lines.push("");
  if (args.topics.length > 0) {
    lines.push("## Topics");
    lines.push("");
    for (const t2 of [...args.topics].sort((a, b2) => a.topicSlug.localeCompare(b2.topicSlug))) {
      lines.push(`- [${t2.topicSlug}](topics/${t2.topicSlug}.md) \u2014 ${t2.contributingThreads.length} threads, updated ${t2.updatedAt}`);
    }
    lines.push("");
  }
  if (chrs.length > 0) {
    lines.push("## Chronicles (newest first)");
    lines.push("");
    for (const c3 of [...chrs].sort((a, b2) => a.updatedAt < b2.updatedAt ? 1 : -1)) {
      lines.push(`- [${c3.title}](chronicle/${baseName(c3.path)}) \u2014 ${c3.updatedAt}`);
    }
    lines.push("");
  }
  if (args.cards.length > 0) {
    lines.push("## Cards");
    lines.push("");
    const byType = bucketBy(args.cards, (c3) => c3.type);
    for (const [type, list] of [...byType.entries()].sort()) {
      lines.push(`### ${type}`);
      for (const c3 of list.sort((a, b2) => a.cardSlug.localeCompare(b2.cardSlug))) {
        lines.push(`- [${c3.cardSlug}](cards/${c3.cardSlug}.md)`);
      }
      lines.push("");
    }
  }
  return lines.join("\n");
}
function bucketBy(xs, key) {
  const m = /* @__PURE__ */ new Map();
  for (const x2 of xs) {
    const k2 = key(x2);
    let arr4 = m.get(k2);
    if (!arr4) {
      arr4 = [];
      m.set(k2, arr4);
    }
    arr4.push(x2);
  }
  return m;
}
function sumMapSizes(m, filter) {
  let total = 0;
  for (const list of m.values()) total += filter ? list.filter(filter).length : list.length;
  return total;
}
function recent(chrs, n) {
  return [...chrs].sort((a, b2) => a.updatedAt < b2.updatedAt ? 1 : -1).slice(0, n);
}
function projectLastActive(chrs, tops, crds) {
  const ts = [];
  for (const c3 of chrs) ts.push(c3.updatedAt);
  for (const t2 of tops) ts.push(t2.updatedAt);
  for (const c3 of crds) ts.push(c3.updatedAt);
  if (ts.length === 0) return "\u2014";
  ts.sort();
  return ts[ts.length - 1].slice(0, 10);
}
function latestUpdate(idx) {
  const ts = [];
  for (const c3 of Object.values(idx.chronicles)) ts.push(c3.updatedAt);
  for (const t2 of Object.values(idx.topics)) ts.push(t2.updatedAt);
  for (const c3 of Object.values(idx.cards)) ts.push(c3.updatedAt);
  if (ts.length === 0) return "\u2014";
  ts.sort();
  return ts[ts.length - 1].slice(0, 10);
}
function baseName(path) {
  const ix = path.lastIndexOf("/");
  return ix < 0 ? path : path.slice(ix + 1);
}
function writeRel(repoRoot, relPath, body) {
  const abs = join7(repoRoot, relPath);
  mkdirSync4(dirname(abs), { recursive: true });
  writeFileSync3(abs, body);
}
var init_book_catalog = __esm({
  "src/digest/book-catalog.ts"() {
    "use strict";
  }
});

// src/digest/wikilinks.ts
import { posix, relative, dirname as nodeDirname } from "node:path";
function resolveWikiLinks(body, ctx) {
  const unresolved = [];
  const fromDir = nodeDirname(ctx.fromPath);
  const out = body.replace(WIKILINK_RE, (whole, target, alt) => {
    const t2 = target.trim();
    const altText = alt?.trim();
    if (t2.startsWith("chronicle/")) {
      const threadId = t2.slice("chronicle/".length);
      const entry = findChronicleByThreadId(ctx.bookIndex, threadId);
      if (entry && entry.path) {
        const rel = posix.relative(fromDir, entry.path);
        const text = altText ?? entry.title ?? threadId;
        return `[${text}](${rel})`;
      }
      unresolved.push(t2);
      return whole;
    }
    if (t2.startsWith("topic/") || t2.startsWith("topics/")) {
      const topicSlug = t2.slice(t2.indexOf("/") + 1);
      const topic = findTopicBySlug(ctx.bookIndex, topicSlug, ctx.fromProject);
      if (topic && topic.path) {
        const rel = posix.relative(fromDir, topic.path);
        const text = altText ?? topicSlug;
        return `[${text}](${rel})`;
      }
      unresolved.push(t2);
      return whole;
    }
    const cardSlug = t2.startsWith("cards/") ? t2.slice("cards/".length) : t2;
    const card = findCardBySlug(ctx.bookIndex, cardSlug, ctx.fromProject);
    if (card && card.path) {
      const rel = posix.relative(fromDir, card.path);
      const text = altText ?? cardSlug;
      return `[${text}](${rel})`;
    }
    unresolved.push(t2);
    return whole;
  });
  return { body: out, unresolved };
}
function findChronicleByThreadId(bookIndex, threadId) {
  const direct = bookIndex.chronicles[threadId];
  if (direct && !direct.skip && direct.path) return direct;
  for (const c3 of Object.values(bookIndex.chronicles)) {
    if (c3.threadId === threadId && !c3.skip && c3.path) return c3;
  }
  return void 0;
}
function findCardBySlug(bookIndex, cardSlug, preferredProject) {
  const candidates = Object.values(bookIndex.cards).filter((c3) => c3.cardSlug === cardSlug);
  if (candidates.length === 0) return void 0;
  return candidates.find((c3) => c3.project === preferredProject) ?? candidates.find((c3) => c3.project === "_global") ?? candidates[0];
}
function findTopicBySlug(bookIndex, topicSlug, preferredProject) {
  const candidates = Object.values(bookIndex.topics).filter((t2) => t2.topicSlug === topicSlug);
  if (candidates.length === 0) return void 0;
  return candidates.find((t2) => t2.project === preferredProject) ?? candidates[0];
}
var WIKILINK_RE;
var init_wikilinks = __esm({
  "src/digest/wikilinks.ts"() {
    "use strict";
    WIKILINK_RE = /\[\[([^\[\]\|]+?)(?:\|([^\[\]]+?))?\]\]/g;
  }
});

// src/commands/publish.ts
var publish_exports = {};
__export(publish_exports, {
  publishCmd: () => publishCmd
});
import { readFileSync as readFileSync5, writeFileSync as writeFileSync4, mkdirSync as mkdirSync5, existsSync as existsSync6, copyFileSync as copyFileSync2 } from "node:fs";
import { join as join8, dirname as dirname2 } from "node:path";
async function publishCmd(opts) {
  const cfg = readPluginConfig();
  const bookIndex = loadBookIndexV2(cfg.repoPath);
  const report = {
    chroniclesInserted: 0,
    chroniclesSkipped: 0,
    topicsUpdated: 0,
    topicsInserted: 0,
    cardsInserted: 0,
    cardsUpdated: 0,
    bookIndexFiles: [],
    committed: false,
    pushed: false
  };
  const chronicleWrites = [];
  const topicWrites = [];
  const cardWrites = [];
  if (opts.chroniclesPath) {
    const inputs = readJsonInput(opts.chroniclesPath, "chronicles");
    for (const c3 of inputs) {
      try {
        const r2 = registerChronicle(cfg.repoPath, bookIndex, c3);
        if (r2.skipped) report.chroniclesSkipped++;
        else {
          report.chroniclesInserted++;
          if (r2.write) chronicleWrites.push(r2.write);
        }
      } catch (err) {
        throw new Error(`chronicle threadId='${c3?.threadId ?? "?"}' project='${c3?.project ?? "?"}': ${err.message}`);
      }
    }
  }
  if (opts.topicsPath) {
    const inputs = readJsonInput(opts.topicsPath, "topics");
    for (const t2 of inputs) {
      try {
        const r2 = registerTopic(cfg.repoPath, bookIndex, t2);
        if (r2.updated) report.topicsUpdated++;
        else report.topicsInserted++;
        topicWrites.push(r2.write);
      } catch (err) {
        throw new Error(`topic slug='${t2?.topicSlug ?? "?"}' project='${t2?.project ?? "?"}': ${err.message}`);
      }
    }
  }
  if (opts.cardsPath) {
    console.error(source_default.yellow(
      `! --cards is deprecated as of vibebook 0.4 \u2014 atomic cards now belong to memex.
  Install memex (npm install -g @touchskyer/memex) and use /memex-retro after
  the chronicle/topic publish. The cards in your input file will still be written
  this run for backward compat, but new runs of /vibebook won't generate cards.`
    ));
    const inputs = readJsonInput(opts.cardsPath, "cards");
    for (const c3 of inputs) {
      try {
        const r2 = registerCard(cfg.repoPath, bookIndex, c3);
        if (r2.updated) report.cardsUpdated++;
        else report.cardsInserted++;
        cardWrites.push(r2.write);
      } catch (err) {
        throw new Error(`card slug='${c3?.cardSlug ?? "?"}' project='${c3?.project ?? "?"}': ${err.message}`);
      }
    }
  }
  const allUnresolved = [];
  const writeWithLinks = (absPath, body, project, repoRel) => {
    const r2 = resolveWikiLinks(body, { fromPath: repoRel, fromProject: project, bookIndex });
    for (const u of r2.unresolved) allUnresolved.push({ from: repoRel, target: u });
    mkdirSync5(dirname2(absPath), { recursive: true });
    writeFileSync4(absPath, r2.body.endsWith("\n") ? r2.body : r2.body + "\n");
  };
  for (const w of chronicleWrites) {
    writeWithLinks(w.absPath, w.body, w.project, repoRelOf(cfg.repoPath, w.absPath));
  }
  for (const w of topicWrites) {
    if (w.backupOf && existsSync6(w.absPath)) copyFileSync2(w.absPath, w.backupOf);
    writeWithLinks(w.absPath, w.body, w.project, repoRelOf(cfg.repoPath, w.absPath));
  }
  for (const w of cardWrites) {
    writeWithLinks(w.absPath, w.body, w.project, repoRelOf(cfg.repoPath, w.absPath));
  }
  if (allUnresolved.length > 0) {
    console.error(source_default.yellow(`
  ${allUnresolved.length} unresolved wikilink(s):`));
    for (const u of allUnresolved.slice(0, 10)) {
      console.error(source_default.gray(`    in ${u.from}: [[${u.target}]]`));
    }
    if (allUnresolved.length > 10) {
      console.error(source_default.gray(`    ... and ${allUnresolved.length - 10} more`));
    }
  }
  if (!opts.noCatalog) {
    const catalog = generateBookCatalog(cfg.repoPath, bookIndex);
    report.bookIndexFiles = catalog.written;
  }
  saveBookIndexV2(cfg.repoPath, bookIndex);
  if (!opts.noCommit && cfg.repoUrl && cfg.deviceBranch) {
    const stagedRel = [];
    const pushRel = (abs) => stagedRel.push(repoRelOf(cfg.repoPath, abs));
    for (const w of chronicleWrites) pushRel(w.absPath);
    for (const w of topicWrites) {
      pushRel(w.absPath);
      if (w.backupOf) pushRel(w.backupOf);
    }
    for (const w of cardWrites) pushRel(w.absPath);
    for (const f of report.bookIndexFiles) stagedRel.push(repoRelOf(cfg.repoPath, f));
    stagedRel.push(".vibebook/index.book.json");
    const r2 = await commitAndPushBook(cfg.repoPath, cfg.repoUrl, cfg.deviceBranch, report, stagedRel);
    report.committed = r2.committed;
    report.pushed = r2.pushed;
  }
  return report;
}
function registerChronicle(repoRoot, bookIndex, c3) {
  assertNonEmpty("chronicle.project", c3.project);
  assertNonEmpty("chronicle.threadId", c3.threadId);
  assertNonEmpty("chronicle.title", c3.title);
  assertNonEmptyArray("chronicle.sessionIds", c3.sessionIds);
  const dateStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  if (c3.skip) {
    insertChronicle(bookIndex, {
      threadId: c3.threadId,
      project: c3.project,
      title: c3.title,
      sessionIds: c3.sessionIds,
      path: "",
      createdAt: dateStr,
      updatedAt: dateStr,
      tags: c3.tags ?? [],
      skip: true,
      skipReason: c3.skipReason
    });
    return { skipped: true };
  }
  const filename = chronicleFilename(c3, dateStr);
  const relPath = `book/${c3.project}/chronicle/${filename}`;
  insertChronicle(bookIndex, {
    threadId: c3.threadId,
    project: c3.project,
    title: c3.title,
    sessionIds: c3.sessionIds,
    path: relPath,
    createdAt: dateStr,
    updatedAt: dateStr,
    tags: c3.tags ?? []
  });
  return {
    skipped: false,
    write: { absPath: join8(repoRoot, relPath), body: c3.body, project: c3.project }
  };
}
function chronicleFilename(c3, dateStr) {
  const tid8 = c3.threadId.slice(0, 8);
  return `${dateStr}__${c3.threadId}__${tid8}.md`;
}
function registerTopic(repoRoot, bookIndex, t2) {
  assertNonEmpty("topic.project", t2.project);
  assertNonEmpty("topic.topicSlug", t2.topicSlug);
  const relPath = `book/${t2.project}/topics/${t2.topicSlug}.md`;
  const absPath = join8(repoRoot, relPath);
  const dateStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const existing = bookIndex.topics[topicKey(t2.project, t2.topicSlug)];
  const incomingThreads = Array.isArray(t2.contributingThreads) ? t2.contributingThreads : [];
  const entry = {
    topicSlug: t2.topicSlug,
    project: t2.project,
    path: relPath,
    createdAt: existing?.createdAt ?? dateStr,
    updatedAt: dateStr,
    contributingThreads: dedupArray([
      ...existing?.contributingThreads ?? [],
      ...incomingThreads
    ])
  };
  upsertTopic(bookIndex, entry);
  return {
    updated: !!existing,
    write: {
      absPath,
      body: t2.body,
      project: t2.project,
      // Topic full-rewrite rule (SKILL.md step 4): the LLM was supposed to
      // read the old page and preserve historical fact, but if it screwed up,
      // .bak gives the user a recovery path.
      backupOf: existsSync6(absPath) ? absPath + ".bak" : void 0
    }
  };
}
function registerCard(repoRoot, bookIndex, c3) {
  assertNonEmpty("card.project", c3.project);
  assertNonEmpty("card.cardSlug", c3.cardSlug);
  const relPath = `book/${c3.project}/cards/${c3.cardSlug}.md`;
  const dateStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const existing = bookIndex.cards[cardKey(c3.project, c3.cardSlug)];
  const entry = {
    cardSlug: c3.cardSlug,
    project: c3.project,
    type: c3.type,
    path: relPath,
    createdAt: existing?.createdAt ?? dateStr,
    updatedAt: dateStr,
    tags: c3.tags ?? []
  };
  upsertCard(bookIndex, entry);
  return {
    updated: !!existing,
    write: { absPath: join8(repoRoot, relPath), body: c3.body, project: c3.project }
  };
}
function repoRelOf(repoRoot, absPath) {
  return absPath.startsWith(repoRoot + "/") ? absPath.slice(repoRoot.length + 1) : absPath;
}
function readJsonInput(path, label) {
  if (!existsSync6(path)) throw new Error(`${label} input not found: ${path}`);
  try {
    return JSON.parse(readFileSync5(path, "utf8"));
  } catch (e) {
    throw new Error(`${label} input ${path} is not valid JSON: ${e.message}`);
  }
}
function assertNonEmpty(label, v) {
  if (typeof v !== "string" || v.trim().length === 0) {
    throw new Error(
      `${label} is required and must be a non-empty string (got ${JSON.stringify(v)}). If you wrote the value only in YAML frontmatter, also add it to the top level of the JSON entry.`
    );
  }
}
function assertNonEmptyArray(label, v) {
  if (!Array.isArray(v) || v.length === 0 || !v.every((x2) => typeof x2 === "string" && x2.trim().length > 0)) {
    throw new Error(
      `${label} is required and must be a non-empty array of strings (got ${JSON.stringify(v)}). If you wrote the value only in YAML frontmatter, also add it to the top level of the JSON entry.`
    );
  }
}
function dedupArray(xs) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const x2 of xs) {
    if (!seen.has(x2)) {
      seen.add(x2);
      out.push(x2);
    }
  }
  return out;
}
async function commitAndPushBook(repoPath, repoUrl, deviceBranch, report, paths) {
  const git = await ensureRepo(repoPath, repoUrl);
  try {
    await git.fetch();
  } catch {
  }
  await ensureDeviceBranch(git, deviceBranch);
  try {
    await fastForwardBranch(git, deviceBranch, (s) => console.log(source_default.gray(`  ${s}`)));
  } catch (err) {
    console.log(source_default.red(`! could not sync with origin: ${err instanceof Error ? err.message : String(err)}`));
    console.log(source_default.cyan(`  Files written + book index updated, but push skipped.`));
    return { committed: false, pushed: false };
  }
  const msg = `vibebook: +${report.chroniclesInserted} chronicle, ${report.topicsInserted}+${report.topicsUpdated} topic, ${report.cardsInserted}+${report.cardsUpdated} card`;
  const r2 = await commitAndPush(git, msg, paths, deviceBranch, (stage) => console.log(source_default.gray(`  ${stage}`)));
  return { committed: r2.committed, pushed: r2.pushed };
}
var init_publish = __esm({
  "src/commands/publish.ts"() {
    "use strict";
    init_source();
    init_plugin_config();
    init_book_index_v2();
    init_git_ops();
    init_book_catalog();
    init_wikilinks();
  }
});

// src/commands/finalize.ts
var finalize_exports = {};
__export(finalize_exports, {
  finalizeCmd: () => finalizeCmd
});
async function finalizeCmd(opts = {}) {
  const cfg = readPluginConfig();
  try {
    const { git, initialized, path: repoPath } = await ensureLocalRepo(cfg.repoPath);
    let branch = cfg.deviceBranch || "main";
    try {
      const b2 = (await git.raw(["symbolic-ref", "--short", "HEAD"])).trim();
      if (b2) branch = b2;
    } catch {
    }
    let remote = !!cfg.repoUrl;
    if (remote) {
      try {
        const remotes = await git.getRemotes(false);
        remote = remotes.some((r3) => r3.name === "origin");
      } catch {
        remote = false;
      }
    }
    const r2 = await commitWhitelist(
      git,
      repoPath,
      "vibebook: finalize digest (raw_sessions + book + memory)",
      WHITELIST,
      { push: remote && !opts.noPush, branch },
      (s) => console.error(source_default.gray(`  ${s}`))
    );
    return { initialized, committed: r2.committed, pushed: r2.pushed, staged: r2.staged, branch: r2.branch, remote };
  } catch (e) {
    console.error(source_default.red(`finalize: ${e instanceof Error ? e.message : String(e)}`));
    return { initialized: false, committed: false, pushed: false, staged: 0, branch: "", remote: false };
  }
}
var WHITELIST;
var init_finalize = __esm({
  "src/commands/finalize.ts"() {
    "use strict";
    init_source();
    init_plugin_config();
    init_git_ops();
    WHITELIST = [
      "raw_sessions",
      "book",
      "memory",
      ".vibebook/index.json",
      ".vibebook/index.book.json",
      ".vibebook/index.memory.json",
      ".vibebook/index.entity.json",
      ".vibebook/index.qa.json"
    ];
  }
});

// src/memory/types.ts
function memoryKey(entry) {
  return entry.id;
}
function emptyMemoryIndex() {
  return { version: 1, entries: {} };
}
var init_types = __esm({
  "src/memory/types.ts"() {
    "use strict";
  }
});

// src/memory/index-store.ts
import { existsSync as existsSync7, mkdirSync as mkdirSync6, readFileSync as readFileSync6, writeFileSync as writeFileSync5 } from "node:fs";
import { dirname as dirname3, join as join9 } from "node:path";
function loadMemoryIndex(repoRoot) {
  const p2 = join9(repoRoot, MEMORY_INDEX_REL);
  if (!existsSync7(p2)) return emptyMemoryIndex();
  try {
    const parsed = JSON.parse(readFileSync6(p2, "utf8"));
    if (parsed.version !== 1 || !parsed.entries) return emptyMemoryIndex();
    return parsed;
  } catch {
    return emptyMemoryIndex();
  }
}
function saveMemoryIndex(repoRoot, idx) {
  const p2 = join9(repoRoot, MEMORY_INDEX_REL);
  mkdirSync6(dirname3(p2), { recursive: true });
  writeFileSync5(p2, JSON.stringify(idx, null, 2) + "\n");
}
function upsertMemory(idx, entry) {
  idx.entries[memoryKey(entry)] = entry;
}
var MEMORY_INDEX_REL;
var init_index_store2 = __esm({
  "src/memory/index-store.ts"() {
    "use strict";
    init_repo_data_dir();
    init_types();
    MEMORY_INDEX_REL = `${REPO_DATA_DIR}/index.memory.json`;
  }
});

// src/memory/render.ts
function arr(xs) {
  return xs.length === 0 ? "[]" : `[${xs.join(", ")}]`;
}
function scalar(v) {
  return v === null ? "null" : String(v);
}
function renderMemoryMarkdown(entry, body) {
  const fm = [
    "---",
    `id: ${entry.id}`,
    `type: ${entry.type}`,
    `scope: ${entry.scope}`,
    `project: ${scalar(entry.project)}`,
    `title: ${entry.title}`,
    `summary: ${entry.summary}`,
    `status: ${entry.status}`,
    `confidence: ${entry.confidence}`,
    `importance: ${entry.importance}`,
    `createdAt: ${entry.createdAt}`,
    `updatedAt: ${entry.updatedAt}`,
    `validFrom: ${scalar(entry.validFrom)}`,
    `validTo: ${scalar(entry.validTo)}`,
    `supersedes: ${scalar(entry.supersedes)}`,
    `originDevice: ${scalar(entry.originDevice)}`,
    `sourceSessions: ${arr(entry.sourceSessions)}`,
    `sourceCommits: ${arr(entry.sourceCommits)}`,
    `sourceFiles: ${arr(entry.sourceFiles)}`,
    `entities: ${arr(entry.entities)}`,
    "---"
  ].join("\n");
  const trimmedBody = body.replace(/^\n+/, "").replace(/\n+$/, "");
  return `${fm}

# ${entry.title}

${trimmedBody}
`;
}
var init_render = __esm({
  "src/memory/render.ts"() {
    "use strict";
  }
});

// src/memory/gate.ts
function isGated(e) {
  if (!e || typeof e !== "object") return false;
  return e.type === "core" || e.type === "procedural" || e.status === "pinned";
}
function supersedesId(entry) {
  return typeof entry.supersedes === "string" && entry.supersedes.length > 0 ? entry.supersedes : null;
}
function isGatedChange(entry, live) {
  if (isGated(entry)) return true;
  if (isGated(live[entry.id])) return true;
  const sup = supersedesId(entry);
  if (sup && isGated(live[sup])) return true;
  return false;
}
function targetKey(entry) {
  return supersedesId(entry) ?? entry.id;
}
function deriveAction(entry, live) {
  const sup = supersedesId(entry);
  if (sup && live[sup]) return "replace";
  if (live[entry.id]) return "update";
  return "create";
}
function isSafePathSegment(seg) {
  return seg.length > 0 && seg !== "." && !seg.includes("/") && !seg.includes("\\") && !seg.includes("..") && !seg.includes("\0");
}
function safeSegment(seg, label) {
  if (!isSafePathSegment(seg)) {
    throw new Error(`memory path: unsafe ${label} segment ${JSON.stringify(seg)}`);
  }
  return seg;
}
function canonicalMemoryPath(entry) {
  if (!MEMORY_TYPES.has(entry.type)) {
    throw new Error(`memory path: invalid type ${JSON.stringify(entry.type)} (not a MemoryType)`);
  }
  const scopeDir = safeSegment(entry.project ?? "_global", "project");
  const slug = safeSegment(entry.id.split("/").pop() ?? entry.id, "slug");
  return `memory/${entry.type}/${scopeDir}/${slug}.md`;
}
var MEMORY_TYPES;
var init_gate = __esm({
  "src/memory/gate.ts"() {
    "use strict";
    MEMORY_TYPES = /* @__PURE__ */ new Set([
      "core",
      "semantic",
      "episodic",
      "procedural",
      "working",
      "artifact"
    ]);
  }
});

// src/qa/path-guard.ts
import { lstatSync } from "node:fs";
import { join as join10, relative as relative2, sep } from "node:path";
function assertNoSymlinkedComponent(repoPath, targetAbs, label) {
  const rel = relative2(repoPath, targetAbs);
  if (rel === "" || rel === ".." || rel.startsWith(".." + sep)) return;
  let cur = repoPath;
  for (const seg of rel.split(sep)) {
    if (!seg) continue;
    cur = join10(cur, seg);
    let st;
    try {
      st = lstatSync(cur);
    } catch (e) {
      if (e.code === "ENOENT") return;
      throw e;
    }
    if (st.isSymbolicLink()) {
      throw new Error(`${label}: refusing to operate through a symlinked path component (symlink guard): ${seg}`);
    }
  }
}
var init_path_guard = __esm({
  "src/qa/path-guard.ts"() {
    "use strict";
  }
});

// src/memory/apply.ts
import { existsSync as existsSync8, mkdirSync as mkdirSync7, readFileSync as readFileSync7, writeFileSync as writeFileSync6 } from "node:fs";
import { dirname as dirname4, join as join11, resolve as resolve2, sep as sep2 } from "node:path";
function normalizeRel(p2) {
  return p2.split("\\").join("/");
}
function applyMemoryItems(repoPath, items) {
  const idx = loadMemoryIndex(repoPath);
  const memRoot = resolve2(join11(repoPath, "memory"));
  const willExist = { ...idx.entries };
  const planned = [];
  for (const { entry, body } of items) {
    const canonical = canonicalMemoryPath(entry);
    if (entry.path && normalizeRel(entry.path) !== canonical) {
      throw new Error(
        `memory apply: entry.path "${entry.path}" does not match canonical path for ${entry.id} ("${canonical}")`
      );
    }
    const abs = resolve2(join11(repoPath, canonical));
    if (abs !== memRoot && !abs.startsWith(memRoot + sep2)) {
      throw new Error(`memory apply: refusing to write outside memory/: ${canonical}`);
    }
    assertNoSymlinkedComponent(repoPath, abs, "memory apply");
    let supersede = null;
    const sup = supersedesId(entry);
    if (sup && willExist[sup]) {
      const target = willExist[sup];
      const tabs = resolve2(join11(repoPath, canonicalMemoryPath(target)));
      let mdPath = null;
      if (tabs === memRoot || tabs.startsWith(memRoot + sep2)) {
        assertNoSymlinkedComponent(repoPath, tabs, "memory apply");
        mdPath = tabs;
      }
      supersede = { targetId: sup, mdPath };
    }
    planned.push({ entry, body, canonical, abs, supersede });
    willExist[entry.id] = entry;
  }
  let written = 0, superseded = 0;
  const paths = [];
  for (const { entry, body, canonical, abs, supersede } of planned) {
    entry.path = canonical;
    if (supersede && idx.entries[supersede.targetId]) {
      idx.entries[supersede.targetId].status = "superseded";
      superseded++;
      if (supersede.mdPath && existsSync8(supersede.mdPath)) {
        const md = readFileSync7(supersede.mdPath, "utf8").replace(/^status: .*$/m, "status: superseded");
        writeFileSync6(supersede.mdPath, md);
      }
    }
    mkdirSync7(dirname4(abs), { recursive: true });
    writeFileSync6(abs, renderMemoryMarkdown(entry, body));
    upsertMemory(idx, entry);
    written++;
    paths.push(canonical);
  }
  saveMemoryIndex(repoPath, idx);
  return { written, superseded, paths };
}
var init_apply = __esm({
  "src/memory/apply.ts"() {
    "use strict";
    init_index_store2();
    init_render();
    init_gate();
    init_path_guard();
  }
});

// src/commands/memory-write.ts
var memory_write_exports = {};
__export(memory_write_exports, {
  memoryWriteCmd: () => memoryWriteCmd
});
import { existsSync as existsSync9, readFileSync as readFileSync8 } from "node:fs";
async function memoryWriteCmd(opts) {
  if (!opts.inputPath || !existsSync9(opts.inputPath)) {
    throw new Error(`memory-write: --input JSON not found: ${opts.inputPath}`);
  }
  const items = JSON.parse(readFileSync8(opts.inputPath, "utf8"));
  const cfg = readPluginConfig();
  const idx = loadMemoryIndex(cfg.repoPath);
  for (const { entry } of items) {
    if (isGatedChange(entry, idx.entries)) {
      throw new Error(
        `memory-write: refusing gated change targeting "${targetKey(entry)}" (core/procedural/pinned, or it edits/supersedes one) \u2014 use memory-propose`
      );
    }
  }
  return applyMemoryItems(cfg.repoPath, items);
}
var init_memory_write = __esm({
  "src/commands/memory-write.ts"() {
    "use strict";
    init_plugin_config();
    init_index_store2();
    init_apply();
    init_gate();
  }
});

// src/memory/parse.ts
function parseArr(v) {
  const t2 = v.trim();
  if (t2 === "[]" || t2 === "") return [];
  return t2.replace(/^\[|\]$/g, "").split(",").map((s) => s.trim()).filter(Boolean);
}
function parseScalar(v) {
  const t2 = v.trim();
  return t2 === "null" ? null : t2;
}
function parseMemoryMarkdown(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split("\n")) {
    const i2 = line.indexOf(":");
    if (i2 === -1) continue;
    fm[line.slice(0, i2).trim()] = line.slice(i2 + 1).trim();
  }
  if (!fm.id || !fm.type) return null;
  return {
    id: fm.id,
    type: fm.type,
    scope: fm.scope,
    project: parseScalar(fm.project),
    title: fm.title ?? "",
    summary: fm.summary ?? "",
    path: "",
    // filled by caller from the file path
    status: fm.status ?? "active",
    confidence: Number(fm.confidence ?? 0),
    importance: Number(fm.importance ?? 0),
    createdAt: fm.createdAt ?? "",
    updatedAt: fm.updatedAt ?? "",
    validFrom: parseScalar(fm.validFrom ?? "null"),
    validTo: parseScalar(fm.validTo ?? "null"),
    sourceSessions: parseArr(fm.sourceSessions ?? "[]"),
    sourceCommits: parseArr(fm.sourceCommits ?? "[]"),
    sourceFiles: parseArr(fm.sourceFiles ?? "[]"),
    supersedes: parseScalar(fm.supersedes ?? "null"),
    entities: parseArr(fm.entities ?? "[]"),
    originDevice: parseScalar(fm.originDevice ?? "null"),
    accessCount: 0,
    lastAccess: null
  };
}
var init_parse = __esm({
  "src/memory/parse.ts"() {
    "use strict";
  }
});

// src/commands/memory-index.ts
var memory_index_exports = {};
__export(memory_index_exports, {
  memoryIndexCmd: () => memoryIndexCmd
});
import { existsSync as existsSync10, readFileSync as readFileSync9, readdirSync as readdirSync2 } from "node:fs";
import { join as join12, relative as relative3 } from "node:path";
function walkMd(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try {
      entries = readdirSync2(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const p2 = join12(cur, e.name);
      if (e.isDirectory()) stack.push(p2);
      else if (e.isFile() && e.name.endsWith(".md")) out.push(p2);
    }
  }
  return out;
}
async function memoryIndexCmd() {
  const cfg = readPluginConfig();
  const memRoot = join12(cfg.repoPath, "memory");
  const idx = emptyMemoryIndex();
  let indexed = 0;
  if (existsSync10(memRoot)) {
    for (const abs of walkMd(memRoot)) {
      if (abs.includes(`${join12("memory", "_primer")}/`)) continue;
      const entry = parseMemoryMarkdown(readFileSync9(abs, "utf8"));
      if (!entry) continue;
      entry.path = relative3(cfg.repoPath, abs);
      upsertMemory(idx, entry);
      indexed++;
    }
  }
  saveMemoryIndex(cfg.repoPath, idx);
  return { indexed };
}
var init_memory_index = __esm({
  "src/commands/memory-index.ts"() {
    "use strict";
    init_plugin_config();
    init_types();
    init_index_store2();
    init_parse();
  }
});

// src/memory/score.ts
function tokenize(s) {
  return s.toLowerCase().split(/[^a-z0-9_]+/).filter((t2) => t2.length > 1);
}
function isEligible(e, q2) {
  if (e.status === "superseded") return false;
  if (e.validTo !== null && e.validTo <= q2.now) return false;
  if (q2.type && e.type !== q2.type) return false;
  if (e.scope === "global" || e.scope === "user") return true;
  if (q2.project && e.scope === `project:${q2.project}`) return true;
  return q2.project === null;
}
function scoreMemories(entries, q2) {
  const qTokens = new Set(tokenize(q2.text));
  const out = [];
  for (const e of entries) {
    if (!isEligible(e, q2)) continue;
    let score = 0;
    const why = [];
    if (qTokens.size > 0) {
      const haystack = new Set(tokenize(`${e.title} ${e.summary} ${e.entities.join(" ")}`));
      let hits = 0;
      for (const t2 of qTokens) if (haystack.has(t2)) hits++;
      if (hits > 0) {
        score += hits * 5;
        why.push(`keyword\xD7${hits}`);
      }
    }
    if (q2.project && e.scope === `project:${q2.project}`) {
      score += 4;
      why.push("scope:project");
    }
    if (e.scope === "global" || e.scope === "user") {
      score += 2;
      why.push(`scope:${e.scope}`);
    }
    if (e.status === "pinned") {
      score += 3;
      why.push("pinned");
    }
    const qf = new Set(q2.files ?? []);
    const fileHit = e.sourceFiles.filter((f) => qf.has(f)).length;
    if (fileHit > 0) {
      score += fileHit * 3;
      why.push(`file\xD7${fileHit}`);
    }
    const qc = new Set(q2.commits ?? []);
    const commitHit = e.sourceCommits.filter((c3) => qc.has(c3)).length;
    if (commitHit > 0) {
      score += commitHit * 3;
      why.push(`commit\xD7${commitHit}`);
    }
    score += recencyBoost(e.updatedAt, q2.now);
    score += e.importance;
    score += Math.min(e.accessCount, 5) * 0.5;
    if (e.importance >= 3) why.push(`importance:${e.importance}`);
    out.push({ entry: e, score, whyRecalled: why.join(" ") || "scope-eligible" });
  }
  out.sort((a, b2) => b2.score - a.score || a.entry.id.localeCompare(b2.entry.id));
  return out;
}
function recencyBoost(updatedAt, now) {
  const days = (Date.parse(now) - Date.parse(updatedAt)) / 864e5;
  if (!isFinite(days)) return 0;
  if (days <= 7) return 2;
  if (days <= 30) return 1;
  return 0;
}
var init_score = __esm({
  "src/memory/score.ts"() {
    "use strict";
  }
});

// src/memory/primer.ts
function pick2(entries, type, project, max, now) {
  return entries.filter((e) => e.status !== "superseded" && e.type === type).filter((e) => e.validTo === null || e.validTo > now).filter((e) => e.scope === "global" || e.scope === "user" || e.project === project).sort((a, b2) => b2.importance - a.importance || a.title.localeCompare(b2.title)).slice(0, max);
}
function section(title, items) {
  if (items.length === 0) return "";
  const lines = items.map((e) => `- **${e.title}** \u2014 ${e.summary}`);
  return `## ${title}

${lines.join("\n")}
`;
}
function renderPrimer(project, entries, opts = {}) {
  const raw = opts.maxPerSection ?? MAX_PER_SECTION;
  const max = Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : MAX_PER_SECTION;
  const now = opts.now ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const head = `# Project memory: ${project}

> Auto-generated primer. The agent should treat this as already-known project context.
`;
  const sections = [
    section("Core rules", pick2(entries, "core", project, max, now)),
    section("Project facts", pick2(entries, "semantic", project, max, now)),
    section("Procedures & gotchas", pick2(entries, "procedural", project, max, now))
  ].filter(Boolean);
  if (sections.length === 0) return "";
  return [head, ...sections].join("\n");
}
var MAX_PER_SECTION;
var init_primer = __esm({
  "src/memory/primer.ts"() {
    "use strict";
    MAX_PER_SECTION = 12;
  }
});

// src/commands/memory-query.ts
var memory_query_exports = {};
__export(memory_query_exports, {
  memoryQueryCmd: () => memoryQueryCmd
});
import { mkdirSync as mkdirSync8, writeFileSync as writeFileSync7 } from "node:fs";
import { dirname as dirname5, join as join13 } from "node:path";
function isType(s) {
  const ok = ["core", "semantic", "episodic", "procedural", "working", "artifact"];
  return s && ok.includes(s) ? s : null;
}
async function memoryQueryCmd(opts) {
  const cfg = readPluginConfig();
  const cwd = opts.cwd ?? process.cwd();
  const project = resolveProjectFromCwd(cwd, cfg.repoPath);
  const idx = loadMemoryIndex(cfg.repoPath);
  const entries = Object.values(idx.entries);
  const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const scored = scoreMemories(entries, {
    project,
    text: opts.q ?? "",
    type: isType(opts.type),
    now
  });
  const byType = (t2) => scored.filter((s) => s.entry.type === t2);
  let primer = "";
  if (project) {
    primer = renderPrimer(project, entries);
    const abs = join13(cfg.repoPath, "memory", "_primer", `${project}.md`);
    mkdirSync8(dirname5(abs), { recursive: true });
    writeFileSync7(abs, primer);
  }
  const conflicts2 = entries.filter((e) => e.status === "superseded" || e.supersedes !== null || e.validTo !== null).map((e) => ({
    entry: e,
    score: 0,
    whyRecalled: e.status === "superseded" ? "superseded" : e.supersedes !== null ? "supersedes-other" : "time-bounded"
  }));
  const payload = {
    project,
    primer,
    core: byType("core"),
    procedures: byType("procedural"),
    semantic: byType("semantic"),
    episodes: byType("episodic"),
    working: byType("working"),
    conflicts: conflicts2,
    artifacts: byType("artifact"),
    meta: { total: scored.length, project }
  };
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
}
var init_memory_query = __esm({
  "src/commands/memory-query.ts"() {
    "use strict";
    init_plugin_config();
    init_project_resolve();
    init_index_store2();
    init_score();
    init_primer();
  }
});

// src/commands/memory-primer.ts
var memory_primer_exports = {};
__export(memory_primer_exports, {
  memoryPrimerCmd: () => memoryPrimerCmd
});
import { existsSync as existsSync11, readFileSync as readFileSync10 } from "node:fs";
import { join as join14 } from "node:path";
async function memoryPrimerCmd(opts) {
  try {
    const cfg = readPluginConfig();
    const cwd = opts.cwd ?? process.cwd();
    const project = resolveProjectFromCwd(cwd, cfg.repoPath);
    if (!project) return;
    const fileP = join14(cfg.repoPath, "memory", "_primer", `${project}.md`);
    if (existsSync11(fileP)) {
      process.stdout.write(readFileSync10(fileP, "utf8"));
      return;
    }
    const idx = loadMemoryIndex(cfg.repoPath);
    const primer = renderPrimer(project, Object.values(idx.entries));
    if (primer.trim()) process.stdout.write(primer);
  } catch {
  }
}
var init_memory_primer = __esm({
  "src/commands/memory-primer.ts"() {
    "use strict";
    init_plugin_config();
    init_project_resolve();
    init_index_store2();
    init_primer();
  }
});

// src/entity/types.ts
function entityKey(e) {
  return e.id;
}
function emptyEntityIndex() {
  return { version: 1, entries: {} };
}
var init_types2 = __esm({
  "src/entity/types.ts"() {
    "use strict";
  }
});

// src/entity/index-store.ts
import { existsSync as existsSync12, mkdirSync as mkdirSync9, readFileSync as readFileSync11, writeFileSync as writeFileSync8 } from "node:fs";
import { dirname as dirname6, join as join15 } from "node:path";
function loadEntityIndex(repoRoot) {
  const p2 = join15(repoRoot, ENTITY_INDEX_REL);
  if (!existsSync12(p2)) return emptyEntityIndex();
  try {
    const parsed = JSON.parse(readFileSync11(p2, "utf8"));
    if (parsed.version !== 1 || !parsed.entries) return emptyEntityIndex();
    return parsed;
  } catch {
    return emptyEntityIndex();
  }
}
function saveEntityIndex(repoRoot, idx) {
  const p2 = join15(repoRoot, ENTITY_INDEX_REL);
  mkdirSync9(dirname6(p2), { recursive: true });
  writeFileSync8(p2, JSON.stringify(idx, null, 2) + "\n");
}
function upsertEntity(idx, entry) {
  idx.entries[entityKey(entry)] = entry;
}
var ENTITY_INDEX_REL;
var init_index_store3 = __esm({
  "src/entity/index-store.ts"() {
    "use strict";
    init_repo_data_dir();
    init_types2();
    ENTITY_INDEX_REL = `${REPO_DATA_DIR}/index.entity.json`;
  }
});

// src/entity/render.ts
function arr2(xs) {
  return JSON.stringify(xs);
}
function scalar2(v) {
  return v === null ? "null" : v;
}
function renderEntityMarkdown(entry, body) {
  const fm = [
    "---",
    `id: ${entry.id}`,
    `kind: ${entry.kind}`,
    `scope: ${entry.scope}`,
    `project: ${scalar2(entry.project)}`,
    `title: ${entry.title}`,
    `aliases: ${arr2(entry.aliases)}`,
    `sourceMemoryIds: ${arr2(entry.sourceMemoryIds)}`,
    `sourceSessions: ${arr2(entry.sourceSessions)}`,
    `sourceFiles: ${arr2(entry.sourceFiles)}`,
    `relatedEntities: ${arr2(entry.relatedEntities)}`,
    `createdAt: ${entry.createdAt}`,
    `updatedAt: ${entry.updatedAt}`,
    "---"
  ].join("\n");
  const trimmedBody = body.replace(/^\n+/, "").replace(/\n+$/, "");
  return `${fm}

# ${entry.title}

${trimmedBody}
`;
}
var init_render2 = __esm({
  "src/entity/render.ts"() {
    "use strict";
  }
});

// src/commands/entity-write.ts
var entity_write_exports = {};
__export(entity_write_exports, {
  entityWriteCmd: () => entityWriteCmd
});
import { existsSync as existsSync13, mkdirSync as mkdirSync10, readFileSync as readFileSync12, realpathSync, writeFileSync as writeFileSync9 } from "node:fs";
import { dirname as dirname7, join as join16, resolve as resolve3, sep as sep3 } from "node:path";
function entityPath(e) {
  const scopeDir = e.project ?? "_global";
  const slug = e.id.split("/").pop() ?? e.id;
  return `memory/entities/${scopeDir}/${slug}.md`;
}
async function entityWriteCmd(opts) {
  if (!opts.inputPath || !existsSync13(opts.inputPath)) {
    throw new Error(`entity-write: --input JSON not found: ${opts.inputPath}`);
  }
  const items = JSON.parse(readFileSync12(opts.inputPath, "utf8"));
  const cfg = readPluginConfig();
  const idx = loadEntityIndex(cfg.repoPath);
  let written = 0;
  const paths = [];
  for (const { entry, body } of items) {
    if (!entry.path) entry.path = entityPath(entry);
    const entRoot = resolve3(join16(cfg.repoPath, "memory", "entities"));
    mkdirSync10(entRoot, { recursive: true });
    const memRoot = entRoot;
    const abs = resolve3(join16(cfg.repoPath, entry.path));
    if (abs !== memRoot && !abs.startsWith(memRoot + sep3)) {
      throw new Error(`entity-write: refusing to write outside memory/entities/: ${entry.path}`);
    }
    mkdirSync10(dirname7(abs), { recursive: true });
    const realParent = realpathSync(dirname7(abs));
    const realRoot = realpathSync(entRoot);
    if (realParent !== realRoot && !realParent.startsWith(realRoot + sep3)) {
      throw new Error(`entity-write: refusing to write outside memory/entities/ (symlink guard): ${entry.path}`);
    }
    const resolvedBody = body;
    writeFileSync9(abs, renderEntityMarkdown(entry, resolvedBody));
    upsertEntity(idx, entry);
    written++;
    paths.push(entry.path);
  }
  saveEntityIndex(cfg.repoPath, idx);
  return { written, paths };
}
var init_entity_write = __esm({
  "src/commands/entity-write.ts"() {
    "use strict";
    init_plugin_config();
    init_index_store3();
    init_render2();
  }
});

// src/entity/parse.ts
function parseArr2(v) {
  const t2 = v.trim();
  if (t2 === "" || t2 === "[]") return [];
  if (t2.startsWith("[")) {
    try {
      const parsed = JSON.parse(t2);
      if (Array.isArray(parsed)) return parsed;
    } catch {
    }
  }
  return t2.replace(/^\[|\]$/g, "").split(",").map((s) => s.trim()).filter(Boolean);
}
function parseScalar2(v) {
  const t2 = v.trim();
  return t2 === "null" ? null : t2;
}
function parseEntityMarkdown(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split("\n")) {
    const i2 = line.indexOf(":");
    if (i2 === -1) continue;
    fm[line.slice(0, i2).trim()] = line.slice(i2 + 1).trim();
  }
  if (!fm.id || !fm.kind) return null;
  return {
    id: fm.id,
    kind: fm.kind,
    scope: fm.scope ?? "",
    project: parseScalar2(fm.project ?? "null"),
    title: fm.title ?? "",
    aliases: parseArr2(fm.aliases ?? "[]"),
    sourceMemoryIds: parseArr2(fm.sourceMemoryIds ?? "[]"),
    sourceSessions: parseArr2(fm.sourceSessions ?? "[]"),
    sourceFiles: parseArr2(fm.sourceFiles ?? "[]"),
    relatedEntities: parseArr2(fm.relatedEntities ?? "[]"),
    path: "",
    // filled by caller from the file path
    createdAt: fm.createdAt ?? "",
    updatedAt: fm.updatedAt ?? ""
  };
}
var init_parse2 = __esm({
  "src/entity/parse.ts"() {
    "use strict";
  }
});

// src/commands/entity-index.ts
var entity_index_exports = {};
__export(entity_index_exports, {
  entityIndexCmd: () => entityIndexCmd
});
import { existsSync as existsSync14, readFileSync as readFileSync13, readdirSync as readdirSync3 } from "node:fs";
import { join as join17, relative as relative4 } from "node:path";
function walkMd2(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try {
      entries = readdirSync3(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const p2 = join17(cur, e.name);
      if (e.isDirectory()) stack.push(p2);
      else if (e.isFile() && e.name.endsWith(".md")) out.push(p2);
    }
  }
  return out;
}
async function entityIndexCmd() {
  const cfg = readPluginConfig();
  const entitiesRoot = join17(cfg.repoPath, "memory", "entities");
  const idx = emptyEntityIndex();
  let indexed = 0;
  if (existsSync14(entitiesRoot)) {
    for (const abs of walkMd2(entitiesRoot)) {
      const entry = parseEntityMarkdown(readFileSync13(abs, "utf8"));
      if (!entry) continue;
      entry.path = relative4(cfg.repoPath, abs);
      upsertEntity(idx, entry);
      indexed++;
    }
  }
  saveEntityIndex(cfg.repoPath, idx);
  return { indexed };
}
var init_entity_index = __esm({
  "src/commands/entity-index.ts"() {
    "use strict";
    init_plugin_config();
    init_types2();
    init_index_store3();
    init_parse2();
  }
});

// src/entity/score.ts
function tokenize2(s) {
  return s.toLowerCase().split(/[^a-z0-9_]+/).filter((t2) => t2.length > 1);
}
function isEligible2(e, q2) {
  if (q2.kind && e.kind !== q2.kind) return false;
  if (e.scope === "global" || e.scope === "user") return true;
  if (q2.project && e.scope === `project:${q2.project}`) return true;
  return q2.project === null;
}
function scoreEntities(entries, q2) {
  const qTokens = new Set(tokenize2(q2.text));
  const out = [];
  for (const e of entries) {
    if (!isEligible2(e, q2)) continue;
    let score = 0;
    const why = [];
    if (qTokens.size > 0) {
      const haystack = new Set(tokenize2(`${e.title} ${e.aliases.join(" ")} ${e.relatedEntities.join(" ")}`));
      let hits = 0;
      for (const t2 of qTokens) if (haystack.has(t2)) hits++;
      if (hits > 0) {
        score += hits * 5;
        why.push(`name\xD7${hits}`);
      }
    }
    if (q2.project && e.scope === `project:${q2.project}`) {
      score += 4;
      why.push("scope:project");
    }
    if (e.scope === "global" || e.scope === "user") {
      score += 2;
      why.push(`scope:${e.scope}`);
    }
    score += recencyBoost2(e.updatedAt, q2.now);
    out.push({ entry: e, score, whyMatched: why.join(" ") || "scope-eligible" });
  }
  out.sort((a, b2) => b2.score - a.score || a.entry.id.localeCompare(b2.entry.id));
  return out;
}
function recencyBoost2(updatedAt, now) {
  const days = (Date.parse(now) - Date.parse(updatedAt)) / 864e5;
  if (!isFinite(days)) return 0;
  if (days < 0) return 0;
  if (days <= 7) return 2;
  if (days <= 30) return 1;
  return 0;
}
var init_score2 = __esm({
  "src/entity/score.ts"() {
    "use strict";
  }
});

// src/commands/entity-query.ts
var entity_query_exports = {};
__export(entity_query_exports, {
  entityQueryCmd: () => entityQueryCmd
});
import { existsSync as existsSync15, readFileSync as readFileSync14, realpathSync as realpathSync2 } from "node:fs";
import { join as join18, resolve as resolve4, sep as sep4 } from "node:path";
function isKind(s) {
  const ok = ["file", "symbol", "api", "concept", "person"];
  return s && ok.includes(s) ? s : null;
}
function isEligibleMemory(m, now, project) {
  if (m.status === "superseded") return false;
  if (m.validTo !== null && m.validTo <= now) return false;
  if (m.scope === "global" || m.scope === "user") return true;
  if (project && m.scope === `project:${project}`) return true;
  return project === null;
}
function isEligibleEntity(e, project) {
  if (e.scope === "global" || e.scope === "user") return true;
  if (project && e.scope === `project:${project}`) return true;
  return project === null;
}
async function entityQueryCmd(opts) {
  const cfg = readPluginConfig();
  const cwd = opts.cwd ?? process.cwd();
  const project = resolveProjectFromCwd(cwd, cfg.repoPath);
  const idx = loadEntityIndex(cfg.repoPath);
  const entries = Object.values(idx.entries);
  const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const scored = scoreEntities(entries, {
    project,
    text: opts.q ?? "",
    kind: isKind(opts.kind),
    now
  });
  const payload = {
    project,
    entities: scored
  };
  if (opts.entity) {
    const entityName = opts.entity.toLowerCase();
    const memIdx = loadMemoryIndex(cfg.repoPath);
    const referencingMemories = Object.values(memIdx.entries).filter((m) => {
      if (!isEligibleMemory(m, now, project)) return false;
      const inEntities = (Array.isArray(m.entities) ? m.entities : []).some((e) => e.toLowerCase() === entityName);
      const inTitle = m.title.toLowerCase().includes(entityName);
      return inEntities || inTitle;
    }).map((m) => ({
      id: m.id,
      title: m.title,
      type: m.type,
      sourceSessions: m.sourceSessions
    }));
    payload.referencingMemories = referencingMemories;
    const nameSlug = entityName.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const entRoot = resolve4(join18(cfg.repoPath, "memory", "entities"));
    const matchedEntities = entries.filter((e) => isEligibleEntity(e, project)).filter((e) => {
      const titleMatch = e.title.toLowerCase() === entityName;
      const aliasMatch = (Array.isArray(e.aliases) ? e.aliases : []).some((a) => typeof a === "string" && a.toLowerCase() === entityName);
      const slugMatch = nameSlug.length > 0 && e.id.toLowerCase().endsWith("/" + nameSlug);
      return titleMatch || aliasMatch || slugMatch;
    }).map((e) => {
      const abs = resolve4(join18(cfg.repoPath, e.path));
      const inRoot = abs === entRoot || abs.startsWith(entRoot + sep4);
      let body = "";
      if (inRoot && existsSync15(abs)) {
        const realRoot = existsSync15(entRoot) ? realpathSync2(entRoot) : entRoot;
        const real = realpathSync2(abs);
        if (real === realRoot || real.startsWith(realRoot + sep4)) {
          body = readFileSync14(abs, "utf8");
        }
      }
      return { entry: e, body };
    });
    payload.matchedEntities = matchedEntities;
  }
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
}
var init_entity_query = __esm({
  "src/commands/entity-query.ts"() {
    "use strict";
    init_plugin_config();
    init_project_resolve();
    init_index_store3();
    init_score2();
    init_index_store2();
  }
});

// src/qa/types.ts
function qaKey(e) {
  return e.id;
}
function emptyQaIndex() {
  return { version: 1, entries: {} };
}
var init_types3 = __esm({
  "src/qa/types.ts"() {
    "use strict";
  }
});

// src/qa/index-store.ts
import { existsSync as existsSync16, mkdirSync as mkdirSync11, readFileSync as readFileSync15, writeFileSync as writeFileSync10 } from "node:fs";
import { dirname as dirname8, join as join19 } from "node:path";
function loadQaIndex(repoRoot) {
  const p2 = join19(repoRoot, QA_INDEX_REL);
  if (!existsSync16(p2)) return emptyQaIndex();
  try {
    const parsed = JSON.parse(readFileSync15(p2, "utf8"));
    if (parsed.version !== 1 || !parsed.entries) return emptyQaIndex();
    return parsed;
  } catch {
    return emptyQaIndex();
  }
}
function saveQaIndex(repoRoot, idx) {
  const p2 = join19(repoRoot, QA_INDEX_REL);
  mkdirSync11(dirname8(p2), { recursive: true });
  writeFileSync10(p2, JSON.stringify(idx, null, 2) + "\n");
}
function upsertQa(idx, entry) {
  idx.entries[qaKey(entry)] = entry;
}
var QA_INDEX_REL;
var init_index_store4 = __esm({
  "src/qa/index-store.ts"() {
    "use strict";
    init_repo_data_dir();
    init_types3();
    QA_INDEX_REL = `${REPO_DATA_DIR}/index.qa.json`;
  }
});

// src/qa/render.ts
function arr3(xs) {
  return JSON.stringify(xs);
}
function renderQaMarkdown(entry, body) {
  const fm = [
    "---",
    `id: ${entry.id}`,
    `scope: ${entry.scope}`,
    `project: ${entry.project === null ? "null" : JSON.stringify(entry.project)}`,
    `question: ${JSON.stringify(entry.question)}`,
    `answerSummary: ${JSON.stringify(entry.answerSummary)}`,
    `kind: ${entry.kind}`,
    `tags: ${arr3(entry.tags)}`,
    `sources: ${arr3(entry.sources)}`,
    `sourceMemoryIds: ${arr3(entry.sourceMemoryIds)}`,
    `sourceSessions: ${arr3(entry.sourceSessions)}`,
    `relatedEntities: ${arr3(entry.relatedEntities)}`,
    `createdAt: ${entry.createdAt}`,
    `updatedAt: ${entry.updatedAt}`,
    "---"
  ].join("\n");
  const trimmedBody = body.replace(/^\n+/, "").replace(/\n+$/, "");
  return `${fm}

# ${entry.question}

${trimmedBody}
`;
}
var init_render3 = __esm({
  "src/qa/render.ts"() {
    "use strict";
  }
});

// src/qa/id.ts
import { createHash } from "node:crypto";
function normalizeSingleLine(s) {
  return s.replace(/\s+/g, " ").trim();
}
function shortHash(canonical) {
  return createHash("sha256").update(canonical).digest("hex").slice(0, 8);
}
function qaSlug(question) {
  const canonical = normalizeSingleLine(question).toLowerCase();
  const hash = shortHash(canonical);
  let kebab = canonical.replace(UNSAFE2, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  kebab = kebab.slice(0, 48).replace(/-$/, "");
  return kebab ? `${kebab}-${hash}` : `q-${hash}`;
}
function qaId(_scope, project, question) {
  const scopeDir = project ?? "_global";
  return `qa/${scopeDir}/${qaSlug(question)}`;
}
var UNSAFE2;
var init_id = __esm({
  "src/qa/id.ts"() {
    "use strict";
    UNSAFE2 = /[\\/:*?"'<>|\s.,;!()[\]{}@#$%^&+=`~]+/g;
  }
});

// src/commands/qa-write.ts
var qa_write_exports = {};
__export(qa_write_exports, {
  qaWriteCmd: () => qaWriteCmd
});
import { existsSync as existsSync17, lstatSync as lstatSync2, mkdirSync as mkdirSync12, readFileSync as readFileSync16, realpathSync as realpathSync3, writeFileSync as writeFileSync11 } from "node:fs";
import { dirname as dirname9, join as join20, resolve as resolve5, sep as sep5 } from "node:path";
function isUnder(child, parent) {
  return child === parent || child.startsWith(parent + sep5);
}
function isSafeProjectSlug(p2) {
  if (!/^[A-Za-z0-9._-]+$/.test(p2)) return false;
  if (p2 === "." || p2 === "..") return false;
  if (p2.endsWith(".")) return false;
  if (WIN_RESERVED.test(p2.split(".")[0])) return false;
  return true;
}
function qaPath(e) {
  const scopeDir = e.project ?? "_global";
  const slug = e.id.split("/").pop() ?? e.id;
  return `memory/qa/${scopeDir}/${slug}.md`;
}
async function qaWriteCmd(opts) {
  if (!opts.inputPath || !existsSync17(opts.inputPath)) {
    throw new Error(`qa-write: --input JSON not found: ${opts.inputPath}`);
  }
  const items = JSON.parse(readFileSync16(opts.inputPath, "utf8"));
  const cfg = readPluginConfig();
  const idx = loadQaIndex(cfg.repoPath);
  let written = 0;
  const paths = [];
  for (const { entry, body } of items) {
    entry.question = normalizeSingleLine(entry.question);
    entry.answerSummary = normalizeSingleLine(entry.answerSummary);
    if (entry.scope.startsWith("project:")) {
      const slug = entry.scope.slice("project:".length).trim();
      if (!isSafeProjectSlug(slug)) {
        throw new Error(`qa-write: invalid project slug in scope ${JSON.stringify(entry.scope)}`);
      }
      entry.project = slug;
      entry.scope = `project:${slug}`;
    } else {
      const s = entry.scope.trim();
      if (s !== "global" && s !== "user") {
        throw new Error(`qa-write: invalid scope ${JSON.stringify(entry.scope)} (expected "global", "user", or "project:<slug>")`);
      }
      entry.scope = s;
      entry.project = null;
    }
    entry.id = qaId(entry.scope, entry.project, entry.question);
    entry.path = qaPath(entry);
    const qaRoot = resolve5(join20(cfg.repoPath, "memory", "qa"));
    const abs = resolve5(join20(cfg.repoPath, entry.path));
    assertNoSymlinkedComponent(cfg.repoPath, dirname9(abs), "qa-write");
    if (abs !== qaRoot && !abs.startsWith(qaRoot + sep5)) {
      throw new Error(`qa-write: refusing to write outside memory/qa/: ${entry.path}`);
    }
    mkdirSync12(qaRoot, { recursive: true });
    const realRepo = realpathSync3(cfg.repoPath);
    const realRoot = realpathSync3(qaRoot);
    if (!isUnder(realRoot, realRepo)) {
      throw new Error(`qa-write: refusing to write outside memory/qa/ (symlink guard): ${entry.path}`);
    }
    mkdirSync12(dirname9(abs), { recursive: true });
    const realParent = realpathSync3(dirname9(abs));
    if (!isUnder(realParent, realRoot)) {
      throw new Error(`qa-write: refusing to write outside memory/qa/ (symlink guard): ${entry.path}`);
    }
    let leafStat;
    try {
      leafStat = lstatSync2(abs);
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    if (leafStat?.isSymbolicLink()) {
      throw new Error(`qa-write: refusing to write through a symlinked target file (symlink guard): ${entry.path}`);
    }
    writeFileSync11(abs, renderQaMarkdown(entry, body));
    upsertQa(idx, entry);
    written++;
    paths.push(entry.path);
  }
  saveQaIndex(cfg.repoPath, idx);
  return { written, paths };
}
var WIN_RESERVED;
var init_qa_write = __esm({
  "src/commands/qa-write.ts"() {
    "use strict";
    init_plugin_config();
    init_index_store4();
    init_render3();
    init_id();
    init_path_guard();
    WIN_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
  }
});

// src/qa/parse.ts
function parseArr3(v) {
  const t2 = v.trim();
  if (t2 === "" || t2 === "[]") return [];
  if (t2.startsWith("[")) {
    try {
      const parsed = JSON.parse(t2);
      if (Array.isArray(parsed)) return parsed;
    } catch {
    }
  }
  return t2.replace(/^\[|\]$/g, "").split(",").map((s) => s.trim()).filter(Boolean);
}
function parseProject(v) {
  const t2 = v.trim();
  if (t2 === "null") return null;
  if (t2.startsWith('"')) {
    try {
      const p2 = JSON.parse(t2);
      if (typeof p2 === "string") return p2;
    } catch {
    }
  }
  return t2;
}
function parseQuoted(v) {
  const t2 = v.trim();
  if (t2.startsWith('"')) {
    try {
      const p2 = JSON.parse(t2);
      if (typeof p2 === "string") return p2;
    } catch {
    }
  }
  return t2;
}
function parseQaMarkdown(md) {
  md = md.replace(/\r\n/g, "\n");
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split("\n")) {
    const i2 = line.indexOf(":");
    if (i2 === -1) continue;
    fm[line.slice(0, i2).trim()] = line.slice(i2 + 1).trim();
  }
  if (!fm.id || !fm.kind) return null;
  return {
    id: fm.id,
    scope: fm.scope ?? "",
    project: parseProject(fm.project ?? "null"),
    question: parseQuoted(fm.question ?? ""),
    answerSummary: parseQuoted(fm.answerSummary ?? ""),
    kind: fm.kind,
    tags: parseArr3(fm.tags ?? "[]"),
    sources: parseArr3(fm.sources ?? "[]"),
    sourceMemoryIds: parseArr3(fm.sourceMemoryIds ?? "[]"),
    sourceSessions: parseArr3(fm.sourceSessions ?? "[]"),
    relatedEntities: parseArr3(fm.relatedEntities ?? "[]"),
    path: "",
    createdAt: fm.createdAt ?? "",
    updatedAt: fm.updatedAt ?? ""
  };
}
var init_parse3 = __esm({
  "src/qa/parse.ts"() {
    "use strict";
  }
});

// src/commands/qa-index.ts
var qa_index_exports = {};
__export(qa_index_exports, {
  qaIndexCmd: () => qaIndexCmd
});
import { existsSync as existsSync18, readFileSync as readFileSync17, readdirSync as readdirSync4 } from "node:fs";
import { join as join21, relative as relative5 } from "node:path";
function walkMd3(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try {
      entries = readdirSync4(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const p2 = join21(cur, e.name);
      if (e.isDirectory()) stack.push(p2);
      else if (e.isFile() && e.name.endsWith(".md")) out.push(p2);
    }
  }
  return out;
}
async function qaIndexCmd() {
  const cfg = readPluginConfig();
  const qaRoot = join21(cfg.repoPath, "memory", "qa");
  const idx = emptyQaIndex();
  let indexed = 0;
  assertNoSymlinkedComponent(cfg.repoPath, qaRoot, "qa-index");
  if (existsSync18(qaRoot)) {
    for (const abs of walkMd3(qaRoot)) {
      const entry = parseQaMarkdown(readFileSync17(abs, "utf8"));
      if (!entry) continue;
      entry.path = relative5(cfg.repoPath, abs);
      upsertQa(idx, entry);
      indexed++;
    }
  }
  saveQaIndex(cfg.repoPath, idx);
  return { indexed };
}
var init_qa_index = __esm({
  "src/commands/qa-index.ts"() {
    "use strict";
    init_plugin_config();
    init_types3();
    init_index_store4();
    init_parse3();
    init_path_guard();
  }
});

// src/qa/score.ts
function tokenize3(s) {
  return s.toLowerCase().split(/[^a-z0-9_]+/).filter((t2) => t2.length > 1);
}
function isEligible3(e, q2) {
  if (q2.kind && e.kind !== q2.kind) return false;
  if (e.scope === "global" || e.scope === "user") return true;
  if (q2.project && e.scope === `project:${q2.project}`) return true;
  return q2.project === null;
}
function recencyBoost3(updatedAt, now) {
  const days = (Date.parse(now) - Date.parse(updatedAt)) / 864e5;
  if (!isFinite(days)) return 0;
  if (days < 0) return 0;
  if (days <= 7) return 2;
  if (days <= 30) return 1;
  return 0;
}
function scoreQa(entries, q2) {
  const qTokens = new Set(tokenize3(q2.text));
  const out = [];
  for (const e of entries) {
    if (!isEligible3(e, q2)) continue;
    let score = 0;
    const why = [];
    if (qTokens.size > 0) {
      const haystack = new Set(tokenize3(`${e.question} ${e.answerSummary} ${e.tags.join(" ")}`));
      let hits = 0;
      for (const t2 of qTokens) if (haystack.has(t2)) hits++;
      if (hits > 0) {
        score += hits * 5;
        why.push(`text\xD7${hits}`);
      }
    }
    if (q2.project && e.scope === `project:${q2.project}`) {
      score += 4;
      why.push("scope:project");
    }
    if (e.scope === "global" || e.scope === "user") {
      score += 2;
      why.push(`scope:${e.scope}`);
    }
    score += recencyBoost3(e.updatedAt, q2.now);
    out.push({ entry: e, score, whyMatched: why.join(" ") || "scope-eligible" });
  }
  out.sort((a, b2) => b2.score - a.score || a.entry.id.localeCompare(b2.entry.id));
  return out;
}
var init_score3 = __esm({
  "src/qa/score.ts"() {
    "use strict";
  }
});

// src/commands/qa-query.ts
var qa_query_exports = {};
__export(qa_query_exports, {
  qaQueryCmd: () => qaQueryCmd
});
function isKind2(s) {
  const ok = ["compound", "troubleshooting", "decision", "operational"];
  return s && ok.includes(s) ? s : null;
}
async function qaQueryCmd(opts) {
  const cfg = readPluginConfig();
  const cwd = opts.cwd ?? process.cwd();
  const project = resolveProjectFromCwd(cwd, cfg.repoPath);
  const idx = loadQaIndex(cfg.repoPath);
  const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const scored = scoreQa(Object.values(idx.entries), {
    project,
    text: opts.q ?? "",
    kind: isKind2(opts.kind),
    now
  });
  const compact = scored.map((s) => ({
    entry: {
      id: s.entry.id,
      scope: s.entry.scope,
      project: s.entry.project,
      question: s.entry.question,
      answerSummary: s.entry.answerSummary,
      kind: s.entry.kind,
      path: s.entry.path
    },
    score: s.score,
    whyMatched: s.whyMatched
  }));
  process.stdout.write(JSON.stringify({ project, qa: compact }, null, 2) + "\n");
}
var init_qa_query = __esm({
  "src/commands/qa-query.ts"() {
    "use strict";
    init_plugin_config();
    init_project_resolve();
    init_index_store4();
    init_score3();
  }
});

// src/memory/lint.ts
function entrySnapshot(e) {
  let s;
  try {
    s = JSON.stringify(e);
  } catch {
    s = String(e);
  }
  if (typeof s !== "string") s = String(s);
  return s.length > 120 ? s.slice(0, 120) + "\u2026" : s;
}
function safeValues(rec) {
  if (!rec || typeof rec !== "object" || Array.isArray(rec)) return [];
  return Object.values(rec).filter(
    (v) => v !== null && typeof v === "object" && !Array.isArray(v)
  );
}
function validEntryExists(rec, id) {
  if (!rec || typeof rec !== "object" || Array.isArray(rec)) return false;
  const v = rec[id];
  return v !== null && typeof v === "object" && !Array.isArray(v) && v.id === id;
}
function inScope(scope, cwdProject) {
  if (typeof scope !== "string") return cwdProject === null;
  if (cwdProject === null) return true;
  if (scope === "global" || scope === "user") return true;
  const scopeProject = scope.startsWith("project:") ? scope.slice("project:".length) : null;
  return scopeProject === cwdProject;
}
function lintMemory(memoryIdx, entityIdx, qaIdx, opts) {
  const issues = [];
  const suggestions = [];
  const memEntries = safeValues(memoryIdx.entries).filter((e) => inScope(e.scope, opts.project));
  for (const e of memEntries) {
    try {
      if (e.status === "active" && e.validTo !== null) {
        const ts = Date.parse(e.validTo);
        let vDate = null;
        if (isFinite(ts)) {
          try {
            vDate = new Date(ts).toISOString().slice(0, 10);
          } catch {
            vDate = null;
          }
        }
        if (vDate === null) {
          issues.push({
            check: "malformed-date",
            severity: "warning",
            layer: "memory",
            id: e.id,
            detail: `unparseable validTo=${JSON.stringify(e.validTo)}`
          });
        } else if (vDate <= opts.now) {
          issues.push({
            check: "expired",
            severity: "warning",
            layer: "memory",
            id: e.id,
            detail: `active memory expired at validTo=${e.validTo} (now ${opts.now})`
          });
        }
      }
      if (typeof e.supersedes === "string" && !validEntryExists(memoryIdx.entries, e.supersedes)) {
        issues.push({
          check: "dangling-supersedes",
          severity: "error",
          layer: "memory",
          id: e.id,
          detail: `supersedes a memory not in the index`,
          refs: [e.supersedes]
        });
      }
      if (typeof e.supersedes === "string" && validEntryExists(memoryIdx.entries, e.supersedes)) {
        const target = memoryIdx.entries[e.supersedes];
        if (target.status === "active") {
          issues.push({
            check: "superseded-conflict",
            severity: "error",
            layer: "memory",
            id: e.id,
            detail: `supersedes ${target.id} but that target is still status=active`,
            refs: [target.id]
          });
        }
      }
      const exemptProvenance = e.type === "core" || e.status === "pinned";
      if (!exemptProvenance && e.sourceSessions.length === 0 && e.sourceCommits.length === 0 && e.sourceFiles.length === 0) {
        issues.push({
          check: "missing-provenance",
          severity: "warning",
          layer: "memory",
          id: e.id,
          detail: `no sourceSessions/sourceCommits/sourceFiles \u2014 origin not traceable`
        });
      }
      if (e.status === "active" && (e.type === "episodic" || e.type === "working")) {
        const age = daysBetween(opts.now, e.updatedAt);
        if (!isFinite(age)) {
          issues.push({
            check: "malformed-date",
            severity: "warning",
            layer: "memory",
            id: e.id,
            detail: `unparseable updatedAt=${JSON.stringify(e.updatedAt)}`
          });
        } else if (age > opts.staleDays) {
          issues.push({
            check: "stale-candidate",
            severity: "info",
            layer: "memory",
            id: e.id,
            detail: `${e.type} not updated in >${opts.staleDays}d (updatedAt=${e.updatedAt})`
          });
        }
      }
    } catch {
      const eid = e && typeof e.id === "string" ? e.id : "<unknown>";
      issues.push({
        check: "malformed-entry",
        severity: "error",
        layer: "memory",
        id: eid,
        detail: `entry has unexpected field types and was skipped (snapshot: ${entrySnapshot(e)})`
      });
    }
  }
  const dupThreshold = opts.dupThreshold ?? 0.6;
  const active = memEntries.filter((e) => e.status === "active");
  const buckets = /* @__PURE__ */ new Map();
  for (const e of active) {
    const key = `${e.type} ${e.scope} ${e.project ?? "_global"}`;
    const arr4 = buckets.get(key) ?? [];
    arr4.push({ e, tokens: tokenize4(`${e.title} ${e.summary}`) });
    buckets.set(key, arr4);
  }
  for (const group of buckets.values()) {
    for (let i2 = 0; i2 < group.length; i2++) {
      for (let j2 = i2 + 1; j2 < group.length; j2++) {
        try {
          const sim = jaccard(group[i2].tokens, group[j2].tokens);
          if (sim >= dupThreshold) {
            const pair = [group[i2].e.id, group[j2].e.id].slice().sort();
            issues.push({
              check: "duplicate-like",
              severity: "info",
              layer: "memory",
              id: pair[0],
              detail: `near-duplicate of ${pair[1]} (overlap ${sim.toFixed(2)})`,
              refs: pair
            });
          }
        } catch {
        }
      }
    }
  }
  const entEntries = safeValues(entityIdx.entries).filter((e) => inScope(e.scope, opts.project));
  for (const e of entEntries) {
    try {
      if (Array.isArray(e.sourceMemoryIds)) {
        for (const mid of e.sourceMemoryIds) {
          if (typeof mid !== "string") continue;
          if (!validEntryExists(memoryIdx.entries, mid)) {
            issues.push({
              check: "entity-dangling-sourceMemoryId",
              severity: "warning",
              layer: "entity",
              id: e.id,
              detail: `sourceMemoryId not in memory index`,
              refs: [mid]
            });
          }
        }
      }
      if (Array.isArray(e.relatedEntities)) {
        for (const rid of e.relatedEntities) {
          if (typeof rid !== "string") continue;
          if (!validEntryExists(entityIdx.entries, rid)) {
            issues.push({
              check: "entity-unknown-relatedEntity",
              severity: "warning",
              layer: "entity",
              id: e.id,
              detail: `relatedEntity not in entity index`,
              refs: [rid]
            });
          }
        }
      }
    } catch {
      const eid = e && typeof e.id === "string" ? e.id : "<unknown>";
      issues.push({
        check: "malformed-entry",
        severity: "error",
        layer: "entity",
        id: eid,
        detail: `entry has unexpected field types and was skipped (snapshot: ${entrySnapshot(e)})`
      });
    }
  }
  const qaEntries = safeValues(qaIdx.entries).filter((e) => inScope(e.scope, opts.project));
  for (const e of qaEntries) {
    try {
      if (Array.isArray(e.sourceMemoryIds)) {
        for (const mid of e.sourceMemoryIds) {
          if (typeof mid !== "string") continue;
          if (!validEntryExists(memoryIdx.entries, mid)) {
            issues.push({
              check: "qa-dangling-sourceMemoryId",
              severity: "warning",
              layer: "qa",
              id: e.id,
              detail: `sourceMemoryId not in memory index`,
              refs: [mid]
            });
          }
        }
      }
      if (Array.isArray(e.relatedEntities)) {
        for (const rid of e.relatedEntities) {
          if (typeof rid !== "string") continue;
          if (!validEntryExists(entityIdx.entries, rid)) {
            issues.push({
              check: "qa-unknown-relatedEntity",
              severity: "warning",
              layer: "qa",
              id: e.id,
              detail: `relatedEntity not in entity index`,
              refs: [rid]
            });
          }
        }
      }
      const expectProject = e.scope.startsWith("project:") ? e.scope.slice("project:".length) : null;
      if (expectProject !== e.project) {
        issues.push({
          check: "qa-scope-leak",
          severity: "error",
          layer: "qa",
          id: e.id,
          detail: `scope=${e.scope} implies project=${JSON.stringify(expectProject)} but stored project=${JSON.stringify(e.project)}`
        });
      }
    } catch {
      const eid = e && typeof e.id === "string" ? e.id : "<unknown>";
      issues.push({
        check: "malformed-entry",
        severity: "error",
        layer: "qa",
        id: eid,
        detail: `entry has unexpected field types and was skipped (snapshot: ${entrySnapshot(e)})`
      });
    }
  }
  const clusterMin = opts.clusterMin ?? 2;
  const epis = active.filter((e) => e.type === "episodic");
  const byEntity = /* @__PURE__ */ new Map();
  for (const e of epis) {
    if (!Array.isArray(e.entities)) continue;
    for (const tok of e.entities) {
      if (typeof tok !== "string") continue;
      const key = `${e.project ?? "_global"}::${tok.toLowerCase()}`;
      const arr4 = byEntity.get(key) ?? [];
      arr4.push(e);
      byEntity.set(key, arr4);
    }
  }
  const seenClusters = /* @__PURE__ */ new Set();
  for (const group of byEntity.values()) {
    const ids = [...new Set(group.map((e) => e.id))].sort();
    if (ids.length < clusterMin) continue;
    const sig = ids.join("|");
    if (seenClusters.has(sig)) continue;
    seenClusters.add(sig);
    suggestions.push({
      check: "promotion-candidate",
      severity: "info",
      layer: "memory",
      id: ids[0],
      detail: `${ids.length} episodic entries share an entity \u2014 consider promoting a stable fact to semantic/procedural (agent decides)`,
      refs: ids
    });
  }
  return {
    generatedAt: opts.generatedAt ?? opts.now,
    counts: { issues: issues.length, suggestions: suggestions.length },
    issues,
    suggestions
  };
}
var tokenize4, jaccard, daysBetween;
var init_lint = __esm({
  "src/memory/lint.ts"() {
    "use strict";
    tokenize4 = (s) => new Set(s.toLowerCase().split(/[^a-z0-9_]+/).filter((t2) => t2.length > 1));
    jaccard = (a, b2) => {
      if (a.size === 0 && b2.size === 0) return 0;
      let inter = 0;
      for (const t2 of a) if (b2.has(t2)) inter++;
      return inter / (a.size + b2.size - inter);
    };
    daysBetween = (a, b2) => (Date.parse(a) - Date.parse(b2)) / 864e5;
  }
});

// src/commands/memory-lint.ts
var memory_lint_exports = {};
__export(memory_lint_exports, {
  memoryLintCmd: () => memoryLintCmd
});
import { existsSync as existsSync19, readFileSync as readFileSync18 } from "node:fs";
import { join as join22 } from "node:path";
function readIndexOnce(repoPath, rel, layer, empty) {
  const p2 = join22(repoPath, rel);
  if (!existsSync19(p2)) return { index: empty, finding: null };
  let parsed;
  try {
    parsed = JSON.parse(readFileSync18(p2, "utf8"));
  } catch {
    return { index: empty, finding: {
      check: "corrupt-index",
      severity: "error",
      layer,
      id: rel,
      detail: "index file is not valid JSON \u2014 treated as empty; findings for this layer may be incomplete"
    } };
  }
  const ok = parsed && typeof parsed === "object" && parsed.version === 1 && typeof parsed.entries === "object" && parsed.entries !== null && !Array.isArray(parsed.entries);
  if (!ok) {
    return { index: empty, finding: {
      check: "corrupt-index",
      severity: "error",
      layer,
      id: rel,
      detail: "index file is not a valid v1 index (version/entries shape) \u2014 treated as empty; findings for this layer may be incomplete"
    } };
  }
  return { index: parsed, finding: null };
}
function humanReport(r2) {
  const lines = [];
  lines.push(`# memory-lint \u2014 ${r2.counts.issues} issue(s), ${r2.counts.suggestions} suggestion(s)`);
  const group = (title, fs) => {
    if (fs.length === 0) return;
    lines.push(`
## ${title}`);
    for (const f of fs) {
      lines.push(`- [${f.severity}] ${f.layer}/${f.check} \u2014 ${f.id}: ${f.detail}` + (f.refs && f.refs.length ? ` (refs: ${f.refs.join(", ")})` : ""));
    }
  };
  group("Issues", r2.issues);
  group("Suggestions", r2.suggestions);
  if (r2.counts.issues === 0 && r2.counts.suggestions === 0) lines.push("\n\u2713 clean");
  return lines.join("\n") + "\n";
}
async function memoryLintCmd(opts) {
  const cfg = readPluginConfig();
  let project = null;
  if (opts.cwd) {
    try {
      project = resolveProjectFromCwd(opts.cwd, cfg.repoPath);
    } catch {
      project = null;
    }
  }
  const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const staleDays = Number.isFinite(opts.staleDays) && opts.staleDays > 0 ? Math.floor(opts.staleDays) : 90;
  const m = readIndexOnce(cfg.repoPath, MEMORY_INDEX_REL, "memory", emptyMemoryIndex());
  const e = readIndexOnce(cfg.repoPath, ENTITY_INDEX_REL, "entity", emptyEntityIndex());
  const q2 = readIndexOnce(cfg.repoPath, QA_INDEX_REL, "qa", emptyQaIndex());
  const report = lintMemory(m.index, e.index, q2.index, { now, staleDays, project, generatedAt: now });
  const corrupt = [m.finding, e.finding, q2.finding].filter((f) => f !== null);
  if (corrupt.length) {
    report.issues = [...corrupt, ...report.issues];
    report.counts = { issues: report.issues.length, suggestions: report.suggestions.length };
  }
  process.stdout.write(opts.json ? JSON.stringify(report, null, 2) + "\n" : humanReport(report));
}
var init_memory_lint = __esm({
  "src/commands/memory-lint.ts"() {
    "use strict";
    init_plugin_config();
    init_project_resolve();
    init_index_store2();
    init_index_store3();
    init_index_store4();
    init_types();
    init_types2();
    init_types3();
    init_lint();
  }
});

// src/memory/proposal-store.ts
import { createHash as createHash2 } from "node:crypto";
import { existsSync as existsSync20, mkdirSync as mkdirSync13, readFileSync as readFileSync19, readdirSync as readdirSync5, rmSync, writeFileSync as writeFileSync12 } from "node:fs";
import { homedir as homedir3 } from "node:os";
import { join as join23, resolve as resolve6 } from "node:path";
function vibebookHome() {
  return join23(homedir3(), ".vibebook");
}
function proposalsDir(repoPath) {
  const repoHash = createHash2("sha256").update(resolve6(repoPath)).digest("hex").slice(0, 12);
  return join23(vibebookHome(), "local-proposals", repoHash);
}
function guardQueuePath(targetAbs) {
  assertNoSymlinkedComponent(vibebookHome(), targetAbs, "proposal-store");
}
function flatTargetKey(targetKey2) {
  if (targetKey2.includes("__")) {
    throw new Error(`proposal-store: target key may not contain "__": ${JSON.stringify(targetKey2)}`);
  }
  const flat = targetKey2.split("/").join("__");
  if (flat.includes("..") || flat.includes("/") || flat.includes("\\") || flat.length === 0) {
    throw new Error(`proposal-store: unsafe target key ${JSON.stringify(targetKey2)}`);
  }
  return flat;
}
function fileFor(repoPath, idOrKey) {
  const flat = idOrKey.includes("/") ? flatTargetKey(idOrKey) : flatTargetKey(idOrKey.split("__").join("/"));
  return join23(proposalsDir(repoPath), `${flat}.json`);
}
function writeProposal(repoPath, p2) {
  const dir = proposalsDir(repoPath);
  const file = join23(dir, `${flatTargetKey(p2.targetKey)}.json`);
  guardQueuePath(file);
  mkdirSync13(dir, { recursive: true });
  writeFileSync12(file, JSON.stringify(p2, null, 2) + "\n");
  return file;
}
function readProposal(repoPath, idOrKey) {
  let file;
  try {
    file = fileFor(repoPath, idOrKey);
  } catch {
    return null;
  }
  guardQueuePath(file);
  if (!existsSync20(file)) return null;
  try {
    return JSON.parse(readFileSync19(file, "utf8"));
  } catch {
    return null;
  }
}
function listProposals(repoPath) {
  const dir = proposalsDir(repoPath);
  guardQueuePath(dir);
  if (!existsSync20(dir)) return [];
  const out = [];
  for (const name of readdirSync5(dir).sort()) {
    if (!name.endsWith(".json")) continue;
    const file = join23(dir, name);
    guardQueuePath(file);
    try {
      out.push(JSON.parse(readFileSync19(file, "utf8")));
    } catch {
    }
  }
  return out;
}
function deleteProposal(repoPath, idOrKey) {
  let file;
  try {
    file = fileFor(repoPath, idOrKey);
  } catch {
    return null;
  }
  guardQueuePath(file);
  if (!existsSync20(file)) return null;
  rmSync(file);
  return file;
}
var init_proposal_store = __esm({
  "src/memory/proposal-store.ts"() {
    "use strict";
    init_path_guard();
  }
});

// src/commands/memory-propose.ts
var memory_propose_exports = {};
__export(memory_propose_exports, {
  memoryProposeCmd: () => memoryProposeCmd
});
import { existsSync as existsSync21, readFileSync as readFileSync20 } from "node:fs";
async function memoryProposeCmd(opts) {
  if (!opts.inputPath || !existsSync21(opts.inputPath)) {
    throw new Error(`memory-propose: --input JSON not found: ${opts.inputPath}`);
  }
  const items = JSON.parse(readFileSync20(opts.inputPath, "utf8"));
  const cfg = readPluginConfig();
  const idx = loadMemoryIndex(cfg.repoPath);
  for (const { entry } of items) {
    if (!isGatedChange(entry, idx.entries)) {
      throw new Error(
        `memory-propose: "${entry.id}" is not a gated change (not core/procedural/pinned and does not edit/supersede one) \u2014 use memory-write`
      );
    }
  }
  const paths = [];
  const targetKeys = [];
  const proposedEntryIds = [];
  for (const { entry, body, rationale, sourceSession } of items) {
    entry.path = canonicalMemoryPath(entry);
    const tKey = targetKey(entry);
    const p2 = {
      proposalId: flatTargetKey(tKey),
      targetKey: tKey,
      proposedEntryId: entry.id,
      action: deriveAction(entry, idx.entries),
      rationale: rationale ?? null,
      sourceSession: sourceSession ?? null,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      proposal: { entry, body }
    };
    paths.push(writeProposal(cfg.repoPath, p2));
    targetKeys.push(tKey);
    proposedEntryIds.push(entry.id);
  }
  return { proposed: items.length, paths, targetKeys, proposedEntryIds };
}
var init_memory_propose = __esm({
  "src/commands/memory-propose.ts"() {
    "use strict";
    init_plugin_config();
    init_index_store2();
    init_gate();
    init_proposal_store();
  }
});

// src/commands/memory-diff.ts
var memory_diff_exports = {};
__export(memory_diff_exports, {
  memoryDiffCmd: () => memoryDiffCmd
});
function str(v) {
  return v === null || v === void 0 ? null : String(v);
}
function bodyPreview(body) {
  const first3 = body.split("\n").slice(0, 3).join("\n");
  return first3.length <= 240 ? first3 : first3.slice(0, 240);
}
function buildView(p2, live) {
  const proposed = p2.proposal.entry;
  const changes = [];
  for (const f of FIELDS) {
    const oldV = live ? str(live[f]) : null;
    const newV = str(proposed[f]);
    if (oldV !== newV) changes.push({ field: String(f), old: oldV, new: newV });
  }
  const isCreate = p2.action === "create" || !live;
  const body = p2.proposal.body;
  const display = {
    targetKey: p2.targetKey,
    proposedEntryId: p2.proposedEntryId,
    action: p2.action,
    type: String(proposed.type),
    title: proposed.title,
    summary: proposed.summary,
    scope: String(proposed.scope),
    status: String(proposed.status),
    importance: proposed.importance,
    confidence: proposed.confidence,
    rationale: p2.rationale,
    sourceSession: p2.sourceSession,
    changedFields: isCreate ? [] : changes.map((c3) => c3.field),
    bodyLineCount: body.split("\n").length,
    bodyPreview: bodyPreview(body)
  };
  return {
    targetKey: p2.targetKey,
    proposedEntryId: p2.proposedEntryId,
    action: p2.action,
    rationale: p2.rationale,
    sourceSession: p2.sourceSession,
    fieldChanges: changes,
    oldBody: live ? `(current: ${live.path})` : null,
    newBody: body,
    display
  };
}
function typeLabel(d) {
  return d.status === "pinned" ? `[${d.type}] [pinned]` : `[${d.type}]`;
}
function renderList(views) {
  if (views.length === 0) return "No pending memory proposals.";
  const lines = [
    `${views.length} pending memory proposal(s) \u2014 review before approving (do NOT blind-approve)`,
    ""
  ];
  views.forEach((v, i2) => {
    const d = v.display;
    const changes = d.changedFields.length ? ` \xB7 changes: ${d.changedFields.join(", ")}` : "";
    lines.push(`[${i2 + 1}] ${typeLabel(d)} ${d.targetKey} (${d.action}${changes})`);
    lines.push(`    ${d.summary}`);
    const src = d.sourceSession ? `src ${d.sourceSession} \xB7 ` : "";
    lines.push(`    ${src}imp ${d.importance}`);
  });
  lines.push("");
  lines.push("Full body: memory-diff --id <targetKey>");
  lines.push("Apply: memory-approve --id <targetKey> (one at a time) \xB7 Discard: memory-reject --id <targetKey>");
  return lines.join("\n");
}
function renderDetail(v) {
  const d = v.display;
  const lines = [
    `${typeLabel(d)} ${d.targetKey} (${d.action})`,
    `src ${d.sourceSession ?? "\u2014"} \xB7 imp ${d.importance} \xB7 conf ${d.confidence}`
  ];
  if (d.rationale) lines.push(`rationale: ${d.rationale}`);
  if (d.action !== "create" && v.fieldChanges.length) {
    lines.push("changes:");
    for (const c3 of v.fieldChanges) lines.push(`  ${c3.field}: ${c3.old ?? "(none)"} \u2192 ${c3.new ?? "(none)"}`);
  }
  lines.push("--- proposed body ---");
  lines.push(v.newBody.split("\n").map((l) => `    ${l}`).join("\n"));
  lines.push("");
  lines.push(`Apply: memory-approve --id ${d.targetKey} \xB7 Discard: memory-reject --id ${d.targetKey}`);
  return lines.join("\n");
}
async function memoryDiffCmd(opts) {
  try {
    const cfg = readPluginConfig();
    const idx = loadMemoryIndex(cfg.repoPath);
    let proposals;
    if (opts.id) {
      const one = readProposal(cfg.repoPath, opts.id);
      proposals = one ? [one] : [];
    } else {
      proposals = listProposals(cfg.repoPath);
    }
    const views = proposals.map((p2) => buildView(p2, idx.entries[p2.targetKey]));
    if (opts.json) {
      console.log(JSON.stringify(views, null, 2));
      return;
    }
    if (opts.id) {
      console.log(views.length ? renderDetail(views[0]) : "No pending memory proposals.");
      return;
    }
    console.log(renderList(views));
  } catch (e) {
    if (opts.json) {
      console.log("[]");
      return;
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`memory-diff: unable to read proposals (${msg})`);
  }
}
var FIELDS;
var init_memory_diff = __esm({
  "src/commands/memory-diff.ts"() {
    "use strict";
    init_plugin_config();
    init_index_store2();
    init_proposal_store();
    FIELDS = [
      "type",
      "scope",
      "project",
      "title",
      "summary",
      "status",
      "confidence",
      "importance",
      "supersedes",
      "validFrom",
      "validTo"
    ];
  }
});

// src/commands/memory-approve.ts
var memory_approve_exports = {};
__export(memory_approve_exports, {
  memoryApproveCmd: () => memoryApproveCmd
});
import { existsSync as existsSync22, readdirSync as readdirSync6, rmSync as rmSync2 } from "node:fs";
import { join as join24 } from "node:path";
function refreshPrimers(repoPath, entry) {
  const dir = join24(repoPath, "memory", "_primer");
  if (!existsSync22(dir)) return [];
  assertNoSymlinkedComponent(repoPath, dir, "memory-approve");
  const deleted = [];
  const del = (file) => {
    if (!existsSync22(file)) return;
    assertNoSymlinkedComponent(repoPath, file, "memory-approve");
    rmSync2(file);
    deleted.push(file);
  };
  const deleteAll = () => {
    for (const name of readdirSync6(dir)) if (name.endsWith(".md")) del(join24(dir, name));
  };
  const scope = typeof entry.scope === "string" ? entry.scope : "";
  const project = scope.startsWith("project:") ? scope.slice("project:".length) : null;
  if (project && isSafePathSegment(project)) {
    del(join24(dir, `${project}.md`));
  } else {
    deleteAll();
  }
  return deleted;
}
async function memoryApproveCmd(opts) {
  if (!opts.id) throw new Error("memory-approve: --id <targetKey> is required");
  const cfg = readPluginConfig();
  const prop = readProposal(cfg.repoPath, opts.id);
  if (!prop) throw new Error(`memory-approve: no pending proposal for "${opts.id}"`);
  const report = applyMemoryItems(cfg.repoPath, [prop.proposal]);
  const path = deleteProposal(cfg.repoPath, prop.targetKey);
  if (!path) {
    throw new Error(
      `memory-approve: applied "${prop.targetKey}" to live memory, but its proposal could not be removed from the queue \u2014 remove it manually`
    );
  }
  const primersRefreshed = refreshPrimers(cfg.repoPath, prop.proposal.entry);
  return {
    applied: 1,
    written: report.written,
    superseded: report.superseded,
    primersRefreshed,
    path
  };
}
var init_memory_approve = __esm({
  "src/commands/memory-approve.ts"() {
    "use strict";
    init_plugin_config();
    init_apply();
    init_proposal_store();
    init_path_guard();
    init_gate();
  }
});

// src/commands/memory-reject.ts
var memory_reject_exports = {};
__export(memory_reject_exports, {
  memoryRejectCmd: () => memoryRejectCmd
});
async function memoryRejectCmd(opts) {
  if (!opts.id) throw new Error("memory-reject: --id <targetKey> is required");
  const cfg = readPluginConfig();
  const prop = readProposal(cfg.repoPath, opts.id);
  if (!prop) {
    throw new Error(`memory-reject: no pending proposal for "${opts.id}"`);
  }
  const path = deleteProposal(cfg.repoPath, prop.targetKey);
  if (!path) {
    throw new Error(`memory-reject: proposal "${prop.targetKey}" could not be removed from the queue`);
  }
  return { rejected: 1, path };
}
var init_memory_reject = __esm({
  "src/commands/memory-reject.ts"() {
    "use strict";
    init_plugin_config();
    init_proposal_store();
  }
});

// src/commands/recall.ts
var recall_exports = {};
__export(recall_exports, {
  buildRecallPayload: () => buildRecallPayload,
  parseMemexIndex: () => parseMemexIndex,
  recallCmd: () => recallCmd
});
import { existsSync as existsSync23, readFileSync as readFileSync21 } from "node:fs";
import { spawnSync } from "node:child_process";
import { join as join25 } from "node:path";
function buildRecallPayload(opts = {}) {
  const cfg = readPluginConfig();
  const bookIndex = loadBookIndexV2(cfg.repoPath);
  let projectFilter = opts.project?.trim() || null;
  let cwdUnresolved = false;
  if (!projectFilter && !opts.all && opts.cwd) {
    projectFilter = resolveProjectFromCwd(opts.cwd, cfg.repoPath);
    if (!projectFilter) {
      cwdUnresolved = true;
    }
  }
  if (opts.topic) {
    return buildStage2(cfg.repoPath, bookIndex, projectFilter, opts.topic, opts.noMemex !== true && !cwdUnresolved);
  }
  return buildStage1(cfg.repoPath, bookIndex, projectFilter, cwdUnresolved, opts.noMemex !== true);
}
function buildStage1(repoPath, bookIndex, projectFilter, cwdUnresolved, queryMemex) {
  const entries = [];
  for (const t2 of Object.values(bookIndex.topics)) {
    const project = t2.project || projectFromPath(t2.path);
    if (!project) continue;
    if (projectFilter && project !== projectFilter) continue;
    entries.push({
      kind: "topic",
      project,
      title: titleForArtifact(repoPath, t2.path, t2.topicSlug),
      summary: summaryFor(repoPath, t2.path),
      path: t2.path,
      slug: t2.topicSlug,
      updatedAt: t2.updatedAt,
      tags: []
    });
  }
  let memexQueried = false;
  if (queryMemex) {
    const memexEntries = loadMemexCatalog();
    if (memexEntries !== null) {
      memexQueried = true;
      entries.push(...memexEntries);
    }
  }
  const kindOrder = {
    "memex-card": 0,
    topic: 1,
    chronicle: 2
  };
  entries.sort((a, b2) => {
    if (a.kind !== b2.kind) return kindOrder[a.kind] - kindOrder[b2.kind];
    return a.updatedAt < b2.updatedAt ? 1 : -1;
  });
  const topicCount = entries.filter((e) => e.kind === "topic").length;
  const memexCount = entries.filter((e) => e.kind === "memex-card").length;
  return {
    stage: "stage-1-topics",
    project: projectFilter,
    topic: null,
    repoPath,
    entries,
    meta: {
      topics: topicCount,
      chronicles: 0,
      ...memexQueried ? { memexQueried, memexCards: memexCount } : {},
      ...cwdUnresolved ? { cwdUnresolved: true } : {},
      nextStep: topicCount > 0 ? `Pick a relevant topic, then run: \${CLAUDE_PLUGIN_ROOT}/bin/vibebook-plugin.js recall --project <slug> --topic <topicSlug>` : "No topics yet for this project."
    }
  };
}
function buildStage2(repoPath, bookIndex, projectFilter, topicSlug, queryMemex) {
  const entries = [];
  const topic = Object.values(bookIndex.topics).find((t2) => {
    const proj = t2.project || projectFromPath(t2.path);
    return t2.topicSlug === topicSlug && (!projectFilter || proj === projectFilter);
  });
  if (topic) {
    const contributing = new Set(topic.contributingThreads ?? []);
    for (const c3 of Object.values(bookIndex.chronicles)) {
      if (c3.skip) continue;
      if (!contributing.has(c3.threadId)) continue;
      const project = c3.project || projectFromPath(c3.path) || "_unknown";
      const fm = readChronicleFrontmatter(repoPath, c3.path);
      entries.push({
        kind: "chronicle",
        project,
        title: titleForArtifact(repoPath, c3.path, c3.title || c3.threadId),
        summary: summarizeFrontmatter(fm),
        path: join25(repoPath, c3.path),
        slug: c3.threadId,
        frontmatter: fm,
        updatedAt: c3.updatedAt,
        tags: c3.tags ?? []
      });
    }
  }
  let memexQueried = false;
  if (queryMemex) {
    const memexEntries = loadMemexCatalog();
    if (memexEntries !== null) {
      memexQueried = true;
      const filtered = memexEntries.filter(
        (m) => m.tags.some((tag) => tag.toLowerCase().includes(topicSlug.toLowerCase()))
      );
      entries.push(...filtered.length > 0 ? filtered : memexEntries);
    }
  }
  const kindOrder = {
    "memex-card": 0,
    chronicle: 1,
    topic: 2
  };
  entries.sort((a, b2) => {
    if (a.kind !== b2.kind) return kindOrder[a.kind] - kindOrder[b2.kind];
    return a.updatedAt < b2.updatedAt ? 1 : -1;
  });
  return {
    stage: "stage-2-articles",
    project: projectFilter,
    topic: topicSlug,
    repoPath,
    entries,
    meta: {
      topics: 0,
      chronicles: entries.filter((e) => e.kind === "chronicle").length,
      ...memexQueried ? { memexQueried, memexCards: entries.filter((e) => e.kind === "memex-card").length } : {},
      nextStep: "Read full bodies via the Read tool on entry.path. For memex cards: `memex read <slug>`."
    }
  };
}
function projectFromPath(path) {
  if (!path) return null;
  const parts = path.split("/").filter(Boolean);
  if (parts.length < 2 || parts[0] !== "book") return null;
  return parts[1] || null;
}
function titleForArtifact(repoPath, repoRel, fallback) {
  const abs = join25(repoPath, repoRel);
  if (!existsSync23(abs)) return fallback;
  const head = readFileSync21(abs, "utf8").slice(0, 1024);
  const hMatch = head.match(/^#\s+(.+?)\s*$/m);
  if (hMatch) return hMatch[1].trim();
  const fmMatch = head.match(/^---[\s\S]*?\ntitle:\s*(.+?)\s*\n[\s\S]*?---/);
  if (fmMatch) return fmMatch[1].replace(/^["']|["']$/g, "").trim();
  return fallback;
}
function summaryFor(repoPath, repoRel) {
  const abs = join25(repoPath, repoRel);
  if (!existsSync23(abs)) return "";
  const body = readFileSync21(abs, "utf8");
  const stripped = body.replace(/^---[\s\S]*?---\s*\n/, "");
  const lines = stripped.split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#") || line.startsWith("---")) continue;
    if (line.startsWith("- ") || line.startsWith("* ")) continue;
    if (line.startsWith(">") || line.startsWith("```")) continue;
    const plain = line.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_2, a, b2) => b2 || a).replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/`([^`]+)`/g, "$1");
    return plain.length > 200 ? plain.slice(0, 200) + "\u2026" : plain;
  }
  return "";
}
function readChronicleFrontmatter(repoPath, repoRel) {
  const abs = join25(repoPath, repoRel);
  if (!existsSync23(abs)) return {};
  const body = readFileSync21(abs, "utf8");
  const m = body.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const lines = m[1].split("\n");
  const result = {};
  const lists = {};
  let currentList = null;
  for (const raw of lines) {
    const line = raw;
    if (line.match(/^\s+-\s+/)) {
      if (currentList) {
        const item = line.replace(/^\s+-\s+/, "").trim().replace(/^["']|["']$/g, "");
        if (item) lists[currentList].push(item);
      }
      continue;
    }
    const m2 = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (!m2) {
      currentList = null;
      continue;
    }
    const key = m2[1];
    const after = m2[2].trim();
    if (after === "") {
      currentList = key;
      lists[key] = [];
    } else {
      currentList = null;
      const cleaned = after.replace(/^["']|["']$/g, "");
      if (key === "status") result.status = cleaned;
    }
  }
  if (lists.files_touched) result.files_touched = lists.files_touched;
  if (lists.commits) result.commits = lists.commits;
  if (lists.decisions) result.decisions = lists.decisions;
  if (lists.blockers) result.blockers = lists.blockers;
  if (lists.next_steps) result.next_steps = lists.next_steps;
  return result;
}
function summarizeFrontmatter(fm) {
  const bits = [];
  if (fm.status) bits.push(`status=${fm.status}`);
  if (fm.files_touched?.length) bits.push(`${fm.files_touched.length} files`);
  if (fm.commits?.length) bits.push(`${fm.commits.length} commits`);
  if (fm.decisions?.length) bits.push(`${fm.decisions.length} decisions`);
  if (fm.blockers?.length) bits.push(`${fm.blockers.length} blockers`);
  return bits.join(" \xB7 ") || "(no AI-first frontmatter \u2014 legacy chronicle)";
}
function prettifySlug(slug) {
  const stripped = slug.replace(/^(gotcha|pattern|decision|howto|tool)-/, "");
  const spaced = stripped.replace(/-/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
async function recallCmd(opts) {
  const payload = buildRecallPayload(opts);
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
}
function loadMemexCatalog() {
  const r2 = spawnSync("memex", ["read", "index"], {
    encoding: "utf8",
    timeout: 2e3,
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (r2.error || r2.status !== 0) return null;
  return parseMemexIndex(r2.stdout);
}
function parseMemexIndex(md) {
  const out = [];
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  let category = "_memex";
  for (const raw of md.split("\n")) {
    const line = raw.trim();
    const catMatch = line.match(/^##\s+(.+?)\s*$/);
    if (catMatch) {
      category = catMatch[1].trim();
      continue;
    }
    const linkMatch = line.match(/^[-*]\s+\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\](?:\s*[—\-:]\s*(.+))?\s*$/);
    if (!linkMatch) continue;
    const slug = linkMatch[1].trim();
    const altText = linkMatch[2]?.trim();
    const summary = (linkMatch[3] ?? "").trim();
    out.push({
      kind: "memex-card",
      project: "_memex",
      title: altText || prettifySlug(slug),
      summary,
      path: `memex:${slug}`,
      slug,
      updatedAt: today,
      tags: category && category !== "_memex" ? [category] : []
    });
  }
  return out;
}
var init_recall = __esm({
  "src/commands/recall.ts"() {
    "use strict";
    init_plugin_config();
    init_book_index_v2();
    init_project_resolve();
    init_slug();
  }
});

// src/commands/catalog-regen.ts
var catalog_regen_exports = {};
__export(catalog_regen_exports, {
  catalogRegenCmd: () => catalogRegenCmd
});
async function catalogRegenCmd(opts) {
  const cfg = readPluginConfig();
  const bookIndex = loadBookIndexV2(cfg.repoPath);
  const catalog = generateBookCatalog(cfg.repoPath, bookIndex);
  const report = {
    written: catalog.written,
    committed: false,
    pushed: false
  };
  if (opts.noCommit || !cfg.repoUrl || !cfg.deviceBranch) return report;
  const git = await ensureRepo(cfg.repoPath, cfg.repoUrl);
  try {
    await git.fetch();
  } catch {
  }
  await ensureDeviceBranch(git, cfg.deviceBranch);
  try {
    await fastForwardBranch(git, cfg.deviceBranch, (s) => console.log(source_default.gray(`  ${s}`)));
  } catch (err) {
    console.log(source_default.red(`! could not sync with origin: ${err instanceof Error ? err.message : String(err)}`));
    console.log(source_default.cyan(`  Catalog regenerated locally; push skipped.`));
    return report;
  }
  const r2 = await commitAndPush(
    git,
    "vibebook: regen catalog",
    catalog.written,
    cfg.deviceBranch,
    (stage) => console.log(source_default.gray(`  ${stage}`))
  );
  report.committed = r2.committed;
  report.pushed = r2.pushed;
  return report;
}
var init_catalog_regen = __esm({
  "src/commands/catalog-regen.ts"() {
    "use strict";
    init_source();
    init_plugin_config();
    init_book_index_v2();
    init_book_catalog();
    init_git_ops();
  }
});

// src/commands/site.ts
var site_exports = {};
__export(site_exports, {
  buildSiteCmd: () => buildSiteCmd,
  serveSiteCmd: () => serveSiteCmd
});
import { spawn as spawn3 } from "node:child_process";
import { existsSync as existsSync24, mkdirSync as mkdirSync14, cpSync, readFileSync as readFileSync22, writeFileSync as writeFileSync13, statSync, readdirSync as readdirSync7, rmSync as rmSync3 } from "node:fs";
import { join as join26, dirname as dirname10, resolve as resolve7 } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir as homedir4 } from "node:os";
function siteContext(opts) {
  const cfg = readPluginConfig();
  const repoPath = opts.repoPath ?? cfg.repoPath;
  const here = dirname10(fileURLToPath(import.meta.url));
  const candidates = [
    resolve7(here, "..", "..", "site-template"),
    // src/commands/
    resolve7(here, "..", "..", "..", "site-template"),
    // dist/src/commands/
    resolve7(here, "..", "..", "..", "..", "site-template")
  ];
  const templateDir = candidates.find((c3) => existsSync24(join26(c3, "package.json")));
  if (!templateDir) {
    throw new Error(
      `vibebook site template not found. Tried:
  ${candidates.join("\n  ")}
If you installed vibebook from npm, try \`npm install -g vibebook@latest\`.`
    );
  }
  const sig = templateSignature(templateDir);
  const cacheDir = join26(homedir4(), ".vibebook", "site-cache", sig);
  return {
    templateDir,
    cacheDir,
    repoPath,
    base: opts.base ?? "/",
    siteUrl: opts.siteUrl ?? "http://localhost:4321"
  };
}
function templateSignature(templateDir) {
  const pkg = JSON.parse(readFileSync22(join26(templateDir, "package.json"), "utf8"));
  const seed = JSON.stringify({ name: pkg.name, version: pkg.version, deps: pkg.dependencies });
  return Buffer.from(seed).toString("base64url").slice(0, 12);
}
function syncTemplateInto(templateDir, cacheDir) {
  if (!existsSync24(cacheDir)) mkdirSync14(cacheDir, { recursive: true });
  const skip = /* @__PURE__ */ new Set(["node_modules", "dist", ".astro"]);
  const cacheSrc = join26(cacheDir, "src");
  if (existsSync24(cacheSrc)) rmSync3(cacheSrc, { recursive: true, force: true });
  for (const name of readdirSync7(templateDir)) {
    if (skip.has(name)) continue;
    const src = join26(templateDir, name);
    const dst = join26(cacheDir, name);
    cpSync(src, dst, { recursive: true });
  }
}
async function ensureNodeModules(cacheDir) {
  const nm = join26(cacheDir, "node_modules");
  if (existsSync24(nm)) {
    const astroBin = join26(nm, ".bin", "astro");
    if (existsSync24(astroBin)) return;
  }
  console.log(source_default.cyan(`  installing site template dependencies (one-time, ~1-2 min)...`));
  await runCmd("npm", ["install", "--no-audit", "--no-fund", "--silent"], cacheDir);
}
function runCmd(cmd, args, cwd, env2 = {}) {
  return new Promise((resolveP, reject) => {
    const child = spawn3(cmd, args, {
      cwd,
      stdio: "inherit",
      env: { ...process.env, ...env2 }
    });
    child.on("exit", (code) => {
      if (code === 0) resolveP();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}
async function serveSiteCmd(opts = {}) {
  const ctx = siteContext(opts);
  console.log(source_default.gray(`  template: ${ctx.templateDir}`));
  console.log(source_default.gray(`  cache:    ${ctx.cacheDir}`));
  console.log(source_default.gray(`  repo:     ${ctx.repoPath}`));
  syncTemplateInto(ctx.templateDir, ctx.cacheDir);
  await ensureNodeModules(ctx.cacheDir);
  console.log(source_default.cyan(`
  vibebook serve \u2014 astro dev`));
  console.log(source_default.gray(`  open http://localhost:4321 in your browser; ctrl-c to stop
`));
  await runCmd(
    "node",
    [join26(ctx.cacheDir, "node_modules", "astro", "astro.js"), "dev"],
    ctx.cacheDir,
    { VIBEBOOK_REPO_PATH: ctx.repoPath }
  );
}
async function buildSiteCmd(opts = {}) {
  const ctx = siteContext(opts);
  syncTemplateInto(ctx.templateDir, ctx.cacheDir);
  await ensureNodeModules(ctx.cacheDir);
  console.log(source_default.cyan(`
  vibebook build-site \u2014 astro build`));
  await runCmd(
    "node",
    [join26(ctx.cacheDir, "node_modules", "astro", "astro.js"), "build"],
    ctx.cacheDir,
    {
      VIBEBOOK_REPO_PATH: ctx.repoPath,
      VIBEBOOK_SITE_BASE: ctx.base,
      VIBEBOOK_SITE_URL: ctx.siteUrl
    }
  );
  const builtDist = join26(ctx.cacheDir, "dist");
  const repoDist = join26(ctx.repoPath, "site-dist");
  if (existsSync24(repoDist)) {
    rmSync3(repoDist, { recursive: true, force: true });
  }
  cpSync(builtDist, repoDist, { recursive: true });
  console.log(source_default.green(`
  ok built to ${repoDist}`));
  return { outDir: repoDist };
}
var init_site = __esm({
  "src/commands/site.ts"() {
    "use strict";
    init_source();
    init_plugin_config();
  }
});

// src/spool/plugin-state.ts
import { existsSync as existsSync25, mkdirSync as mkdirSync15, readFileSync as readFileSync23, writeFileSync as writeFileSync14 } from "node:fs";
import { homedir as homedir5 } from "node:os";
import { dirname as dirname11, join as join27 } from "node:path";
function statePath() {
  return join27(homedir5(), ".vibebook", ".plugin-state.json");
}
function loadState() {
  const p2 = statePath();
  if (!existsSync25(p2)) return {};
  try {
    return JSON.parse(readFileSync23(p2, "utf8"));
  } catch {
    return {};
  }
}
function saveState(state) {
  const p2 = statePath();
  mkdirSync15(dirname11(p2), { recursive: true });
  writeFileSync14(p2, JSON.stringify(state, null, 2) + "\n");
}
var init_plugin_state = __esm({
  "src/spool/plugin-state.ts"() {
    "use strict";
  }
});

// src/commands/first-run.ts
var first_run_exports = {};
__export(first_run_exports, {
  firstRunCmd: () => firstRunCmd
});
import { execFileSync } from "node:child_process";
async function firstRunCmd() {
  const state = loadState();
  if (state.firstRunNudgeShown) return;
  const npmCliInstalled = isNpmVibebookOnPath();
  if (!npmCliInstalled) {
    console.log("vibebook plugin: digest + recall ready.");
    console.log("For cross-device session sync, install the optional vibebook npm CLI:");
    console.log("    npm i -g vibebook");
    console.log("(See https://github.com/june9593/vibebook for details.)");
  }
  saveState({ ...state, firstRunNudgeShown: true });
}
function isNpmVibebookOnPath() {
  try {
    execFileSync("/bin/sh", ["-c", "command -v vibebook >/dev/null 2>&1"], {
      stdio: "ignore"
    });
    return true;
  } catch {
    return false;
  }
}
var init_first_run = __esm({
  "src/commands/first-run.ts"() {
    "use strict";
    init_plugin_state();
  }
});

// src/spool/ensure-dir.ts
import { mkdirSync as mkdirSync16, existsSync as existsSync26 } from "node:fs";
import { homedir as homedir6 } from "node:os";
import { join as join28 } from "node:path";
function ensureSpoolDir() {
  const spoolRoot = join28(homedir6(), SPOOL_REL_PATH);
  const created = !existsSync26(spoolRoot);
  const rawSessionsDir = join28(spoolRoot, "raw_sessions");
  const bookDir = join28(spoolRoot, "book");
  mkdirSync16(rawSessionsDir, { recursive: true });
  mkdirSync16(bookDir, { recursive: true });
  return { spoolRoot, rawSessionsDir, bookDir, created };
}
var SPOOL_REL_PATH;
var init_ensure_dir = __esm({
  "src/spool/ensure-dir.ts"() {
    "use strict";
    SPOOL_REL_PATH = ".vibebook/session-repo";
  }
});

// src/_shared/content-project-inference.ts
import { readdirSync as readdirSync8 } from "node:fs";
import { homedir as homedir7 } from "node:os";
import { join as join29 } from "node:path";
function decodeProjectDirName(name) {
  if (!name.startsWith("-")) return name;
  return "/" + name.slice(1).replace(/-/g, "/");
}
function listKnownProjectRoots(projectsDir = join29(homedir7(), ".claude", "projects")) {
  let entries;
  try {
    entries = readdirSync8(projectsDir);
  } catch {
    return [];
  }
  const out = entries.map((name) => {
    const path = decodeProjectDirName(name);
    return { path, slug: projectSlugFromPath(path) };
  });
  out.sort((a, b2) => b2.path.length - a.path.length);
  return out;
}
function pathToProjectSlug(absPath, roots) {
  if (!absPath || !absPath.startsWith("/")) return null;
  for (const r2 of roots) {
    if (absPath === r2.path || absPath.startsWith(r2.path + "/")) return r2.slug;
  }
  const lastSlash = absPath.lastIndexOf("/");
  if (lastSlash <= 0) return null;
  const dir = absPath.slice(0, lastSlash);
  const slug = projectSlugFromPath(dir);
  if (slug === "home" || slug === "root" || dir.startsWith("/tmp/") || dir.startsWith("/private/tmp/") || dir.startsWith("/etc") || dir.startsWith("/usr") || dir.startsWith("/var") || dir.startsWith("/System") || dir.startsWith("/opt")) return null;
  return slug;
}
function extractPathsFromMessages(messages) {
  const out = [];
  for (const m of messages) {
    const raw = m.raw;
    const content = raw?.message?.content;
    if (!Array.isArray(content)) continue;
    const seen = /* @__PURE__ */ new Set();
    for (const block of content) {
      if (!block || typeof block !== "object") continue;
      const b2 = block;
      if (b2.type !== "tool_use") continue;
      const inp = b2.input ?? {};
      const name = b2.name ?? "";
      if (name === "Read" || name === "Write" || name === "Edit" || name === "NotebookEdit") {
        const fp = inp.file_path ?? inp.notebook_path;
        if (typeof fp === "string" && fp.startsWith("/")) seen.add(fp);
      } else if (name === "Bash") {
        const cmd = inp.command;
        if (typeof cmd === "string") {
          for (const m2 of cmd.matchAll(/\/[A-Za-z0-9._\-/]+(?:\.[A-Za-z0-9]+)?/g)) {
            const p2 = m2[0];
            if (p2.length < 6) continue;
            if (cmd.includes("http://" + p2) || cmd.includes("https://" + p2)) continue;
            seen.add(p2);
          }
        }
      } else if (name === "Glob" || name === "Grep") {
        const pat = inp.path ?? inp.pattern;
        if (typeof pat === "string" && pat.startsWith("/")) seen.add(pat);
      }
    }
    for (const p2 of seen) out.push(p2);
  }
  return out;
}
function inferProjectFromContent(messages, roots = listKnownProjectRoots()) {
  const paths = extractPathsFromMessages(messages);
  const counts = {};
  let totalHits = 0;
  for (const p2 of paths) {
    const slug = pathToProjectSlug(p2, roots);
    if (!slug) continue;
    counts[slug] = (counts[slug] ?? 0) + 1;
    totalHits++;
  }
  if (totalHits < MIN_PATH_HITS) {
    return { inferredProject: null, confidence: 0, totalHits, perProject: counts };
  }
  let topSlug = "";
  let topCount = 0;
  for (const [slug, c3] of Object.entries(counts)) {
    if (c3 > topCount) {
      topCount = c3;
      topSlug = slug;
    }
  }
  const confidence = topCount / totalHits;
  return {
    inferredProject: confidence >= MIN_CONFIDENCE ? topSlug : null,
    confidence,
    totalHits,
    perProject: counts
  };
}
var MIN_CONFIDENCE, MIN_PATH_HITS;
var init_content_project_inference = __esm({
  "src/_shared/content-project-inference.ts"() {
    "use strict";
    init_slug();
    MIN_CONFIDENCE = 0.7;
    MIN_PATH_HITS = 5;
  }
});

// src/_shared/sources/claude-code.ts
import { createHash as createHash3 } from "node:crypto";
import { readdirSync as readdirSync9, readFileSync as readFileSync24, statSync as statSync2, existsSync as existsSync27 } from "node:fs";
import { homedir as homedir8 } from "node:os";
import { join as join30, basename } from "node:path";
function getRoots() {
  if (cachedRoots === null) cachedRoots = listKnownProjectRoots();
  return cachedRoots;
}
function isVibebookOrTmpProjectDir(name) {
  return name.includes("-vibebook-claude-") || name.includes("-memvc-claude-");
}
function parseClaudeJsonl(sourcePath, content) {
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  const messages = [];
  let sessionId = "";
  let cwd = "";
  let startedAt = "";
  let endedAt = "";
  for (const line of lines) {
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }
    if (obj.sessionId && !sessionId) sessionId = obj.sessionId;
    if (obj.cwd && !cwd) cwd = obj.cwd;
    if (obj.type === "user" || obj.type === "assistant") {
      if (obj.isMeta === true) continue;
      const ts = typeof obj.timestamp === "string" ? obj.timestamp : void 0;
      if (ts) {
        if (!startedAt) startedAt = ts;
        endedAt = ts;
      }
      const { text: rawText, reasoning: rawReasoning, contentBlocks } = extractParts(obj.message);
      const text = sanitizeMessageText(rawText);
      const reasoning = sanitizeMessageText(rawReasoning);
      const hasToolBlocks = contentBlocks.some(
        (b2) => b2.type === "tool_use" || b2.type === "tool_result"
      );
      if (text || reasoning || hasToolBlocks) {
        const msg = {
          role: obj.type === "user" ? "user" : "assistant",
          text,
          timestamp: ts,
          raw: obj,
          contentBlocks
        };
        if (reasoning) msg.reasoning = reasoning;
        messages.push(msg);
      }
    }
  }
  const firstUser = messages.find((m) => m.role === "user")?.text ?? "";
  const { slug, display } = deriveSlug(firstUser);
  const fallbackId = basename(sourcePath, ".jsonl");
  const finalId = sessionId || fallbackId;
  const shortId = finalId.slice(0, 8);
  const cwdProject = projectSlugFromPath(cwd);
  const inference = inferProjectFromContent(messages, getRoots());
  const useInferred = inference.inferredProject !== null && inference.inferredProject !== cwdProject && inference.confidence >= MIN_CONFIDENCE;
  const project = useInferred ? inference.inferredProject : cwdProject;
  const out = {
    tool: "claude",
    sessionId: finalId,
    shortId,
    project,
    projectRaw: cwd,
    startedAt: startedAt || (/* @__PURE__ */ new Date(0)).toISOString(),
    endedAt: endedAt || (/* @__PURE__ */ new Date(0)).toISOString(),
    nameSlug: slug,
    displayName: display,
    messages,
    sourcePath
  };
  if (useInferred) {
    out.projectInferredFrom = "content";
    out.cwdProject = cwdProject;
  }
  return out;
}
function extractParts(message) {
  if (!message) return { text: "", reasoning: "", contentBlocks: [] };
  const c3 = message.content;
  if (typeof c3 === "string") {
    return {
      text: c3,
      reasoning: "",
      contentBlocks: [{ type: "text", text: c3 }]
    };
  }
  if (!Array.isArray(c3)) return { text: "", reasoning: "", contentBlocks: [] };
  const texts = [];
  const reasonings = [];
  const blocks = [];
  for (const p2 of c3) {
    if (!p2 || typeof p2 !== "object") continue;
    if (p2.type === "text" && typeof p2.text === "string") {
      texts.push(p2.text);
      blocks.push({ type: "text", text: p2.text });
    } else if (p2.type === "thinking" && typeof p2.thinking === "string" && p2.thinking.length > 0) {
      reasonings.push(p2.thinking);
      blocks.push({ type: "thinking", thinking: p2.thinking });
    } else if (p2.type === "tool_use" && typeof p2.name === "string") {
      const block = { type: "tool_use", name: p2.name, input: p2.input ?? {} };
      if (typeof p2.id === "string") block.id = p2.id;
      blocks.push(block);
    } else if (p2.type === "tool_result") {
      let content = "";
      if (typeof p2.content === "string") content = p2.content;
      else if (Array.isArray(p2.content)) {
        content = p2.content.map((part) => typeof part?.text === "string" ? part.text : "").join("");
      }
      const block = { type: "tool_result", content };
      if (typeof p2.tool_use_id === "string") block.toolUseId = p2.tool_use_id;
      blocks.push(block);
    }
  }
  return {
    text: texts.join("\n"),
    reasoning: reasonings.join("\n"),
    contentBlocks: blocks
  };
}
function sanitizeMessageText(text) {
  if (!text) return "";
  let s = text;
  s = s.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "");
  s = s.replace(/<local-command-caveat>[\s\S]*?<\/local-command-caveat>/g, "");
  s = s.replace(/<local-command-stdout>[\s\S]*?<\/local-command-stdout>/g, "");
  s = s.replace(/<command-message>[\s\S]*?<\/command-message>/g, "");
  s = s.replace(/<command-name>[\s\S]*?<\/command-name>/g, "");
  s = s.replace(/<command-args>[\s\S]*?<\/command-args>/g, "");
  s = s.replace(/<task-notification>[\s\S]*?<\/task-notification>/g, "");
  s = s.replace(/\[Request interrupted by user[^\]]*\]/g, "");
  s = s.replace(/(^|\n)Base directory for this skill:[\s\S]*?(?=\n---\n|$)/g, "");
  if (/^\s*API Error:\s/.test(s)) return "";
  s = s.trim();
  if (s.length < 10) return "";
  return s;
}
var cachedRoots, ClaudeCodeAdapter;
var init_claude_code = __esm({
  "src/_shared/sources/claude-code.ts"() {
    "use strict";
    init_slug();
    init_content_project_inference();
    cachedRoots = null;
    ClaudeCodeAdapter = class {
      constructor(root = join30(homedir8(), ".claude", "projects")) {
        this.root = root;
      }
      name = "claude";
      async *discover() {
        if (!existsSync27(this.root)) return;
        const stack = [this.root];
        while (stack.length) {
          const dir = stack.pop();
          let entries;
          try {
            entries = readdirSync9(dir, { withFileTypes: true });
          } catch {
            continue;
          }
          for (const e of entries) {
            const p2 = join30(dir, e.name);
            if (e.isDirectory()) {
              if (dir === this.root && isVibebookOrTmpProjectDir(e.name)) continue;
              if (e.name === "subagents") continue;
              stack.push(p2);
            } else if (e.isFile() && e.name.endsWith(".jsonl")) {
              const st = statSync2(p2);
              const buf = readFileSync24(p2);
              const sha = createHash3("sha256").update(buf).digest("hex");
              yield {
                sourcePath: p2,
                sourceMtimeMs: st.mtimeMs,
                sourceSha256: sha,
                load: async () => parseClaudeJsonl(p2, buf.toString("utf8"))
              };
            }
          }
        }
      }
    };
  }
});

// src/_shared/sources/vscode-copilot.ts
import { createHash as createHash4 } from "node:crypto";
import { readdirSync as readdirSync10, readFileSync as readFileSync25, statSync as statSync3, existsSync as existsSync28 } from "node:fs";
import { homedir as homedir9 } from "node:os";
import { join as join31, basename as basename2 } from "node:path";
function defaultStorageRoot() {
  if (process.platform === "darwin")
    return join31(homedir9(), "Library", "Application Support", "Code", "User", "workspaceStorage");
  if (process.platform === "win32")
    return join31(homedir9(), "AppData", "Roaming", "Code", "User", "workspaceStorage");
  return join31(homedir9(), ".config", "Code", "User", "workspaceStorage");
}
function readWorkspacePath(workspaceJsonPath) {
  if (!existsSync28(workspaceJsonPath)) return "";
  try {
    const obj = JSON.parse(readFileSync25(workspaceJsonPath, "utf8"));
    const u = obj.folder ?? obj.workspace ?? "";
    if (!u) return "";
    return u.startsWith("file://") ? decodeURIComponent(u.slice("file://".length)) : u;
  } catch {
    return "";
  }
}
function parseCopilotJson(sourcePath, content, workspacePath) {
  const obj = JSON.parse(content);
  const fileBase = basename2(sourcePath, ".json");
  const sessionId = fileBase;
  const requests = Array.isArray(obj.requests) ? obj.requests : [];
  return buildSessionFromRequests(sourcePath, sessionId, requests, workspacePath);
}
function parseCopilotChatSessionsJsonl(sourcePath, content, workspacePath) {
  const fileBase = basename2(sourcePath, ".jsonl");
  let sessionId = fileBase;
  const turns = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const s = line.trim();
    if (!s) continue;
    let obj;
    try {
      obj = JSON.parse(s);
    } catch {
      continue;
    }
    if (obj?.kind === 0 && obj?.v) {
      if (typeof obj.v.sessionId === "string" && obj.v.sessionId) sessionId = obj.v.sessionId;
      if (Array.isArray(obj.v.requests)) {
        for (const r2 of obj.v.requests) turns.push(r2);
      }
      continue;
    }
    if (obj?.kind !== 2 || !Array.isArray(obj.k) || obj.k[0] !== "requests") continue;
    if (obj.k.length === 1 && Array.isArray(obj.v)) {
      for (const r2 of obj.v) turns.push(r2);
    } else if (obj.k.length >= 2 && typeof obj.k[1] === "number") {
      const idx = obj.k[1];
      while (turns.length <= idx) turns.push({});
      if (obj.k.length === 2) {
        turns[idx] = obj.v;
      } else {
        let cur = turns[idx];
        if (cur === void 0 || cur === null) {
          cur = {};
          turns[idx] = cur;
        }
        for (let i2 = 2; i2 < obj.k.length - 1; i2++) {
          const seg = obj.k[i2];
          if (cur[seg] === void 0) cur[seg] = typeof obj.k[i2 + 1] === "number" ? [] : {};
          cur = cur[seg];
        }
        cur[obj.k[obj.k.length - 1]] = obj.v;
      }
    }
  }
  return buildSessionFromRequests(sourcePath, sessionId, turns, workspacePath);
}
function buildSessionFromRequests(sourcePath, sessionId, requests, workspacePath) {
  const messages = [];
  let startedAt = "";
  let endedAt = "";
  for (const r2 of requests) {
    if (!r2) continue;
    const ts = typeof r2.timestamp === "number" ? new Date(r2.timestamp).toISOString() : void 0;
    if (ts) {
      if (!startedAt) startedAt = ts;
      endedAt = ts;
    }
    const userTextRaw = r2?.message?.text;
    if (typeof userTextRaw === "string" && userTextRaw) {
      const userText = sanitizeMessageText(userTextRaw);
      if (userText) messages.push({ role: "user", text: userText, timestamp: ts, raw: r2.message });
    }
    const respParts = Array.isArray(r2.response) ? r2.response : [];
    const { text: rawText, reasoning: rawReasoning, contentBlocks } = extractCopilotResponseParts(respParts);
    const text = sanitizeMessageText(rawText);
    const reasoning = sanitizeMessageText(rawReasoning);
    if (text || reasoning || contentBlocks.length > 0) {
      const msg = { role: "assistant", text, timestamp: ts, raw: respParts };
      if (reasoning) msg.reasoning = reasoning;
      if (contentBlocks.length > 0) msg.contentBlocks = contentBlocks;
      messages.push(msg);
    }
  }
  const firstUser = messages.find((m) => m.role === "user")?.text ?? "";
  const { slug, display } = deriveSlug(firstUser);
  const shortId = sessionId.slice(0, 8);
  return {
    tool: "copilot",
    sessionId,
    shortId,
    project: projectSlugFromPath(workspacePath),
    projectRaw: workspacePath,
    startedAt: startedAt || (/* @__PURE__ */ new Date(0)).toISOString(),
    endedAt: endedAt || (/* @__PURE__ */ new Date(0)).toISOString(),
    nameSlug: slug,
    displayName: display,
    messages,
    sourcePath
  };
}
function extractCopilotResponseParts(parts) {
  const texts = [];
  const reasonings = [];
  const blocks = [];
  for (const p2 of parts) {
    if (!p2 || typeof p2 !== "object") continue;
    const k2 = p2.kind;
    if (k2 === "markdownContent") {
      const v = typeof p2?.content?.value === "string" ? p2.content.value : "";
      if (v) {
        texts.push(v);
        blocks.push({ type: "text", text: v });
      }
    } else if (k2 === "thinking") {
      const v = typeof p2?.value === "string" ? p2.value : "";
      if (v) {
        reasonings.push(v);
        blocks.push({ type: "thinking", thinking: v });
      }
    } else if (k2 === "toolInvocationSerialized") {
      const toolId = typeof p2?.toolId === "string" ? p2.toolId : "tool";
      const past = p2?.pastTenseMessage?.value;
      const cur = p2?.invocationMessage?.value;
      const label = typeof past === "string" && past || typeof cur === "string" && cur || "";
      const input = p2?.toolSpecificData ?? {};
      const block = { type: "tool_use", name: toolId, input };
      if (typeof p2?.toolCallId === "string") block.id = p2.toolCallId;
      blocks.push(block);
      if (label) blocks.push({ type: "tool_result", content: label });
    }
  }
  return {
    text: texts.join("\n"),
    reasoning: reasonings.join("\n"),
    contentBlocks: blocks
  };
}
function parseCopilotTranscript(sourcePath, content, workspacePath) {
  const fileBase = basename2(sourcePath, ".jsonl");
  let sessionId = fileBase;
  const messages = [];
  let startedAt = "";
  let endedAt = "";
  const lines = content.split("\n");
  for (const line of lines) {
    const s = line.trim();
    if (!s) continue;
    let obj;
    try {
      obj = JSON.parse(s);
    } catch {
      continue;
    }
    const t2 = obj?.type;
    const ts = typeof obj?.timestamp === "string" ? obj.timestamp : void 0;
    if (ts) {
      if (!startedAt) startedAt = ts;
      endedAt = ts;
    }
    if (t2 === "session.start") {
      const sid = obj?.data?.sessionId;
      if (typeof sid === "string" && sid) sessionId = sid;
      continue;
    }
    if (t2 === "user.message") {
      const raw = typeof obj?.data?.content === "string" ? obj.data.content : "";
      const text = sanitizeMessageText(raw);
      if (text) messages.push({ role: "user", text, timestamp: ts, raw: obj });
      continue;
    }
    if (t2 === "assistant.message") {
      const rawText = typeof obj?.data?.content === "string" ? obj.data.content : "";
      const rawReasoning = typeof obj?.data?.reasoningText === "string" ? obj.data.reasoningText : "";
      const text = sanitizeMessageText(rawText);
      const reasoning = sanitizeMessageText(rawReasoning);
      if (text || reasoning) {
        const msg = { role: "assistant", text, timestamp: ts, raw: obj };
        if (reasoning) msg.reasoning = reasoning;
        messages.push(msg);
      }
      continue;
    }
    if (t2 === "tool.execution_start" || t2 === "tool.execution_complete") {
      continue;
    }
  }
  const firstUser = messages.find((m) => m.role === "user")?.text ?? "";
  const { slug, display } = deriveSlug(firstUser);
  const shortId = sessionId.slice(0, 8);
  return {
    tool: "copilot",
    sessionId,
    shortId,
    project: projectSlugFromPath(workspacePath),
    projectRaw: workspacePath,
    startedAt: startedAt || (/* @__PURE__ */ new Date(0)).toISOString(),
    endedAt: endedAt || (/* @__PURE__ */ new Date(0)).toISOString(),
    nameSlug: slug,
    displayName: display,
    messages,
    sourcePath
  };
}
var VSCodeCopilotAdapter;
var init_vscode_copilot = __esm({
  "src/_shared/sources/vscode-copilot.ts"() {
    "use strict";
    init_slug();
    init_claude_code();
    VSCodeCopilotAdapter = class {
      constructor(root = defaultStorageRoot()) {
        this.root = root;
      }
      name = "copilot";
      async *discover() {
        if (!existsSync28(this.root)) return;
        let workspaces;
        try {
          workspaces = readdirSync10(this.root, { withFileTypes: true });
        } catch {
          return;
        }
        for (const w of workspaces) {
          if (!w.isDirectory()) continue;
          const wsDir = join31(this.root, w.name);
          const wsPath = readWorkspacePath(join31(wsDir, "workspace.json"));
          const chatDir = join31(wsDir, "chatSessions");
          const chatSessionIds = /* @__PURE__ */ new Set();
          if (existsSync28(chatDir)) {
            let files = [];
            try {
              files = readdirSync10(chatDir, { withFileTypes: true });
            } catch {
              files = [];
            }
            for (const f of files) {
              if (!f.isFile()) continue;
              const isJson = f.name.endsWith(".json");
              const isJsonl = f.name.endsWith(".jsonl");
              if (!isJson && !isJsonl) continue;
              const p2 = join31(chatDir, f.name);
              const st = statSync3(p2);
              if (st.size === 0) continue;
              chatSessionIds.add(basename2(f.name, isJsonl ? ".jsonl" : ".json"));
              const buf = readFileSync25(p2);
              const sha = createHash4("sha256").update(buf).digest("hex");
              yield {
                sourcePath: p2,
                sourceMtimeMs: st.mtimeMs,
                sourceSha256: sha,
                load: async () => isJsonl ? parseCopilotChatSessionsJsonl(p2, buf.toString("utf8"), wsPath) : parseCopilotJson(p2, buf.toString("utf8"), wsPath)
              };
            }
          }
          const transcriptsDir = join31(wsDir, "GitHub.copilot-chat", "transcripts");
          if (existsSync28(transcriptsDir)) {
            let tfiles = [];
            try {
              tfiles = readdirSync10(transcriptsDir, { withFileTypes: true });
            } catch {
              tfiles = [];
            }
            for (const f of tfiles) {
              if (!f.isFile() || !f.name.endsWith(".jsonl")) continue;
              const id = basename2(f.name, ".jsonl");
              if (chatSessionIds.has(id)) continue;
              const p2 = join31(transcriptsDir, f.name);
              const st = statSync3(p2);
              if (st.size === 0) continue;
              const buf = readFileSync25(p2);
              const sha = createHash4("sha256").update(buf).digest("hex");
              yield {
                sourcePath: p2,
                sourceMtimeMs: st.mtimeMs,
                sourceSha256: sha,
                load: async () => parseCopilotTranscript(p2, buf.toString("utf8"), wsPath)
              };
            }
          }
        }
      }
    };
  }
});

// src/_shared/digest/manifest.ts
function extractManifest(messages, messageLineOffsets) {
  const tools_used = {};
  const commits = [];
  const filesSeen = /* @__PURE__ */ new Set();
  const files_touched = [];
  const candidate_decisions = [];
  let user_turns = 0;
  let assistant_turns = 0;
  for (let i2 = 0; i2 < messages.length; i2++) {
    const m = messages[i2];
    const line = messageLineOffsets[i2] ?? 0;
    if (m.role === "user") user_turns++;
    else if (m.role === "assistant") assistant_turns++;
    if (m.role === "user" && m.text && DECISION_RE.test(m.text) && candidate_decisions.length < DECISIONS_CAP) {
      candidate_decisions.push({ line, preview: previewOf(m.text, 100) });
    }
    for (const b2 of m.contentBlocks ?? []) {
      if (b2.type !== "tool_use") continue;
      tools_used[b2.name] = (tools_used[b2.name] ?? 0) + 1;
      if (FILE_TOOLS.has(b2.name)) {
        const fp = readFilePath(b2);
        if (fp && !filesSeen.has(fp) && files_touched.length < FILES_CAP) {
          filesSeen.add(fp);
          files_touched.push(fp);
        }
      }
      if (b2.name === "Bash" && commits.length < COMMITS_CAP) {
        const cmd = readBashCommand(b2);
        if (cmd) {
          const c3 = parseCommit(cmd);
          if (c3) commits.push({ ...c3, line });
          else {
            const t2 = parseTag(cmd);
            if (t2) commits.push({ ...t2, line });
          }
        }
      }
    }
  }
  return {
    user_turns,
    assistant_turns,
    tools_used,
    commits,
    files_touched,
    candidate_decisions
  };
}
function readFilePath(b2) {
  const input = b2.input;
  if (!input || typeof input !== "object") return null;
  return typeof input.file_path === "string" ? input.file_path : null;
}
function readBashCommand(b2) {
  const input = b2.input;
  if (!input || typeof input !== "object") return null;
  return typeof input.command === "string" ? input.command : null;
}
function parseCommit(cmd) {
  const h2 = cmd.match(GIT_COMMIT_HEREDOC_RE);
  if (h2) {
    const body = (h2[2] ?? "").trim();
    const firstLine = body.split("\n", 1)[0].trim();
    return firstLine ? { sha: "", msg: firstLine } : null;
  }
  const m = cmd.match(GIT_COMMIT_RE);
  if (!m) return null;
  const msg = (m[1] ?? m[2] ?? m[3] ?? "").trim();
  return msg ? { sha: "", msg } : null;
}
function parseTag(cmd) {
  const m = cmd.match(GIT_TAG_RE);
  if (!m) return null;
  const tag = m[1];
  const msg = (m[2] ?? m[3] ?? "").trim();
  return { sha: tag, msg: msg || `tag ${tag}` };
}
function previewOf(text, max) {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length > max ? collapsed.slice(0, max - 1) + "\u2026" : collapsed;
}
var FILES_CAP, COMMITS_CAP, DECISIONS_CAP, DECISION_RE, GIT_COMMIT_RE, GIT_COMMIT_HEREDOC_RE, GIT_TAG_RE, FILE_TOOLS;
var init_manifest = __esm({
  "src/_shared/digest/manifest.ts"() {
    "use strict";
    FILES_CAP = 200;
    COMMITS_CAP = 100;
    DECISIONS_CAP = 20;
    DECISION_RE = /(我决定|我们决定|最后采用|最后用|let'?s go with|decided to|going with|ok merged|merged it|ship it as)/i;
    GIT_COMMIT_RE = /\bgit\s+commit\b[^\n]*?-m\s+(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(\S+))/;
    GIT_COMMIT_HEREDOC_RE = /\bgit\s+commit\b[^\n]*?-m\s+"\$\(cat\s+<<\s*'?(\w+)'?[\r\n]+([\s\S]*?)[\r\n]+\1\s*\)"/;
    GIT_TAG_RE = /\bgit\s+tag\b(?:[^\n]*?-(?:a|s)\s+)?\s*(v[\w.\-+]+)(?:[^\n]*?-m\s+(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'))?/;
    FILE_TOOLS = /* @__PURE__ */ new Set(["Read", "Edit", "Write", "MultiEdit", "NotebookEdit"]);
  }
});

// src/_shared/digest/toc.ts
function buildTocEntries(messages, messageLineOffsets) {
  const out = [];
  for (let i2 = 0; i2 < messages.length; i2++) {
    const m = messages[i2];
    const markers = computeMarkers(m);
    if (!markers) continue;
    out.push({
      turn: i2 + 1,
      timestamp: m.timestamp ?? "",
      markers,
      preview: computePreview(m),
      line: messageLineOffsets[i2] ?? 0
    });
  }
  return out;
}
function computeMarkers(m) {
  const marks = [];
  if (m.role === "user" && m.text && m.text.length >= USER_TEXT_MIN) {
    marks.push("\u{1F9D1}");
  }
  if (m.role === "assistant") {
    let hasEdit = false;
    let hasCommit = false;
    for (const b2 of m.contentBlocks ?? []) {
      if (b2.type !== "tool_use") continue;
      if (EDIT_TOOLS.has(b2.name)) hasEdit = true;
      if (b2.name === "Bash") {
        const cmd = readCommand(b2);
        if (cmd && GIT_NOTEWORTHY_RE.test(cmd)) hasCommit = true;
      }
    }
    if (hasCommit) marks.push("\u{1F4BE}");
    if (hasEdit) marks.push("\u270F\uFE0F");
    if (m.text && m.text.length >= ASSISTANT_TEXT_MIN && !hasEdit && !hasCommit) {
      marks.push("\u{1F916}");
    }
  }
  return marks.join("");
}
function computePreview(m) {
  if (m.text) return previewOf2(m.text, 100);
  const actions = [];
  for (const b2 of m.contentBlocks ?? []) {
    if (b2.type !== "tool_use") continue;
    if (EDIT_TOOLS.has(b2.name)) {
      const fp = b2.input?.file_path;
      if (typeof fp === "string") actions.push(`${b2.name} ${fp}`);
      else actions.push(b2.name);
    } else if (b2.name === "Bash") {
      const cmd = readCommand(b2);
      if (cmd) {
        const firstLine = cmd.split("\n", 1)[0].trim();
        actions.push(firstLine);
      }
    }
    if (actions.length >= 2) break;
  }
  return previewOf2(actions.join(" \xB7 "), 100);
}
function readCommand(b2) {
  const input = b2.input;
  if (!input || typeof input !== "object") return null;
  return typeof input.command === "string" ? input.command : null;
}
function previewOf2(text, max) {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length > max ? collapsed.slice(0, max - 1) + "\u2026" : collapsed;
}
function renderTocMarkdown(entries) {
  if (entries.length === 0) return "";
  const header = `# Table of Contents

Importance-based \u2014 real user turns (\u2265${USER_TEXT_MIN} chars), file edits, commits, and substantive assistant replies. Tool-result-only turns omitted.

| # | Time | Marker | Preview | Line |
|---|------|--------|---------|------|`;
  const rows = entries.map((e) => {
    const time = e.timestamp ? e.timestamp.slice(5, 16).replace("T", " ") : "\u2014";
    const preview = escapeTableCell(e.preview);
    return `| ${e.turn} | ${time} | ${e.markers} | ${preview} | \u2192L${e.line} |`;
  });
  return [header, ...rows].join("\n");
}
function escapeTableCell(s) {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
var USER_TEXT_MIN, ASSISTANT_TEXT_MIN, GIT_NOTEWORTHY_RE, EDIT_TOOLS;
var init_toc = __esm({
  "src/_shared/digest/toc.ts"() {
    "use strict";
    USER_TEXT_MIN = 50;
    ASSISTANT_TEXT_MIN = 200;
    GIT_NOTEWORTHY_RE = /\bgit\s+(commit|tag)\b/;
    EDIT_TOOLS = /* @__PURE__ */ new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
  }
});

// src/spool/writer.ts
import { mkdirSync as mkdirSync17, writeFileSync as writeFileSync15 } from "node:fs";
import { join as join32 } from "node:path";
function writeSession(repoRoot, s, opts = {}) {
  const date = s.startedAt.slice(0, 10);
  const dirRel = join32("raw_sessions", s.tool, s.project, date);
  const absDir = join32(repoRoot, dirRel);
  mkdirSync17(absDir, { recursive: true });
  const base = `${s.nameSlug}__${s.shortId}`;
  const mdRel = join32(dirRel, `${base}.md`);
  const includeReasoning = opts.includeReasoning ?? true;
  const fullToolResults = opts.fullToolResults ?? process.env.VIBEBOOK_FULL_TOOL_RESULTS === "1";
  writeFileSync15(
    join32(repoRoot, mdRel),
    renderMarkdown(s, { includeReasoning, fullToolResults })
  );
  return { md: mdRel };
}
function renderMarkdown(s, ctx) {
  const renderedPerMessage = [];
  for (const m of s.messages) {
    const md = renderMessageBlock(m, ctx);
    if (!md) continue;
    renderedPerMessage.push({ md, src: m });
  }
  const bodyParts = [];
  const messageLineOffsetsRelative = [];
  let currentLine = 1;
  for (let i2 = 0; i2 < renderedPerMessage.length; i2++) {
    messageLineOffsetsRelative.push(currentLine);
    const md = renderedPerMessage[i2].md;
    bodyParts.push(md);
    if (i2 < renderedPerMessage.length - 1) {
      currentLine += md.split("\n").length + 1;
    }
  }
  const body = bodyParts.join("\n\n");
  const renderedMessages = renderedPerMessage.map((r2) => r2.src);
  const manifestRel = extractManifest(renderedMessages, messageLineOffsetsRelative);
  const tocRel = buildTocEntries(renderedMessages, messageLineOffsetsRelative);
  const tocMdRel = renderTocMarkdown(tocRel);
  const frontmatterRel = renderFrontmatter(s, manifestRel);
  const tocSection = tocMdRel ? `

${tocMdRel}` : "";
  const prefixRel = frontmatterRel + tocSection + "\n\n";
  const prefixLineCount = prefixRel.split("\n").length - 1;
  const manifest = patchManifestLines(manifestRel, prefixLineCount);
  const toc = tocRel.map((e) => ({ ...e, line: e.line + prefixLineCount }));
  const frontmatter = renderFrontmatter(s, manifest);
  const tocMd = renderTocMarkdown(toc);
  return [frontmatter, tocMd, body].filter(Boolean).join("\n\n");
}
function patchManifestLines(m, offset) {
  return {
    ...m,
    commits: m.commits.map((c3) => ({ ...c3, line: c3.line + offset })),
    candidate_decisions: m.candidate_decisions.map((d) => ({ ...d, line: d.line + offset }))
  };
}
function renderFrontmatter(s, m) {
  const lines = [
    "---",
    `sessionId: ${s.sessionId}`,
    `tool: ${s.tool}`,
    `project: ${s.project}`,
    `projectRaw: ${s.projectRaw}`,
    `startedAt: ${s.startedAt}`,
    `endedAt: ${s.endedAt}`,
    `displayName: ${yamlSafeString(s.displayName)}`,
    `manifest_version: 1`,
    `user_turns: ${m.user_turns}`,
    `assistant_turns: ${m.assistant_turns}`,
    ...renderToolsUsed(m.tools_used),
    ...renderCommits(m.commits),
    ...renderFilesTouched(m.files_touched),
    ...renderCandidateDecisions(m.candidate_decisions),
    "---"
  ];
  return lines.join("\n");
}
function renderToolsUsed(t2) {
  const entries = Object.entries(t2).sort((a, b2) => b2[1] - a[1]);
  if (entries.length === 0) return ["tools_used: {}"];
  return ["tools_used:", ...entries.map(([k2, v]) => `  ${yamlSafeKey(k2)}: ${v}`)];
}
function renderCommits(commits) {
  if (commits.length === 0) return ["commits: []"];
  return [
    "commits:",
    ...commits.map((c3) => `  - { sha: ${yamlSafeString(c3.sha)}, msg: ${yamlSafeString(c3.msg)}, line: ${c3.line} }`)
  ];
}
function renderFilesTouched(files) {
  if (files.length === 0) return ["files_touched: []"];
  return [
    "files_touched:",
    ...files.map((f) => `  - ${yamlSafeString(f)}`)
  ];
}
function renderCandidateDecisions(decisions) {
  if (decisions.length === 0) return ["candidate_decisions: []"];
  return [
    "candidate_decisions:",
    ...decisions.map((d) => `  - { line: ${d.line}, preview: ${yamlSafeString(d.preview)} }`)
  ];
}
function yamlSafeString(s) {
  if (/^[A-Za-z0-9_一-鿿　-〿 -]+$/.test(s) && s === s.trim()) return s;
  const escaped = s.replace(/'/g, "''");
  return `'${escaped}'`;
}
function yamlSafeKey(s) {
  if (/^[A-Za-z0-9_-]+$/.test(s)) return s;
  return `'${s.replace(/'/g, "''")}'`;
}
function renderMessageBlock(m, ctx) {
  const heading = m.role === "user" ? "## User" : m.role === "assistant" ? "## Assistant" : `## ${m.role}`;
  const ts = m.timestamp ? ` _(${m.timestamp})_` : "";
  const rendered = renderMessageContent(m.contentBlocks, m.text, m.reasoning, ctx);
  if (!rendered.trim()) return "";
  return `${heading}${ts}

${rendered}`;
}
function renderMessageContent(blocks, fallbackText, fallbackReasoning, ctx) {
  if (blocks && blocks.length > 0) {
    const out2 = [];
    for (const b2 of blocks) {
      if (b2.type === "thinking") {
        if (!ctx.includeReasoning) continue;
        out2.push(renderThinking(b2.thinking));
      } else if (b2.type === "text") {
        if (b2.text.trim()) out2.push(b2.text);
      } else if (b2.type === "tool_use") {
        out2.push(renderToolUse(b2, ctx));
      } else if (b2.type === "tool_result") {
        out2.push(renderToolResult(b2, ctx));
      }
    }
    return out2.join("\n\n");
  }
  const out = [];
  if (ctx.includeReasoning && fallbackReasoning) {
    out.push(renderThinking(fallbackReasoning));
  }
  if (fallbackText) out.push(fallbackText);
  return out.join("\n\n");
}
function renderThinking(text) {
  const quoted = text.split("\n").map((l) => `> ${l}`).join("\n");
  return `> \u{1F4AD} _thinking_
${quoted}`;
}
function renderToolUse(b2, ctx) {
  const inputStr = JSON.stringify(b2.input, null, 2);
  const truncated = ctx.fullToolResults ? inputStr : maybeTruncate(inputStr, "input");
  return `### \u{1F527} tool_use: ${b2.name}

\`\`\`json
${truncated}
\`\`\``;
}
function renderToolResult(b2, ctx) {
  const truncated = ctx.fullToolResults ? b2.content : maybeTruncate(b2.content, "output");
  return `### \u2705 tool_result

\`\`\`
${truncated}
\`\`\``;
}
function maybeTruncate(s, kind) {
  if (Buffer.byteLength(s, "utf8") <= TRUNCATE_THRESHOLD_BYTES) return s;
  const lines = s.split("\n");
  if (lines.length <= 50) {
    const head2 = s.slice(0, 4e3);
    const tail2 = s.slice(-1e3);
    return `${head2}

[... truncated: ${(Buffer.byteLength(s, "utf8") / 1024).toFixed(1)} KB total, showing first 4000 + last 1000 chars ...]

${tail2}`;
  }
  const head = lines.slice(0, 30).join("\n");
  const tail = lines.slice(-10).join("\n");
  const omitted = lines.length - 40;
  const sizeKb = (Buffer.byteLength(s, "utf8") / 1024).toFixed(1);
  return `${head}

[... truncated: ${sizeKb} KB ${kind}, omitting ${omitted} middle lines ...]

${tail}`;
}
var TRUNCATE_THRESHOLD_BYTES;
var init_writer = __esm({
  "src/spool/writer.ts"() {
    "use strict";
    init_manifest();
    init_toc();
    TRUNCATE_THRESHOLD_BYTES = 20 * 1024;
  }
});

// src/spool/scan-and-import.ts
async function scanAndImport(opts) {
  const { spoolRoot } = ensureSpoolDir();
  const adapters = [
    new ClaudeCodeAdapter(),
    new VSCodeCopilotAdapter()
  ];
  const idx = loadIndex(spoolRoot);
  const result = {
    imported: 0,
    skipped: 0,
    filteredAsPseudoProject: 0,
    filteredByProject: 0
  };
  for (const adapter of adapters) {
    for await (const discovered of adapter.discover()) {
      let session;
      try {
        session = await discovered.load();
      } catch {
        continue;
      }
      if (!isRealProjectPath(session.project)) {
        result.filteredAsPseudoProject++;
        continue;
      }
      if (opts.projectFilter && session.project !== opts.projectFilter) {
        result.filteredByProject++;
        continue;
      }
      if (hasUnchanged(idx, session.tool, session.sessionId, discovered.sourceMtimeMs, discovered.sourceSha256)) {
        result.skipped++;
        continue;
      }
      if (session.messages.length === 0) {
        result.skipped++;
        continue;
      }
      const written = writeSession(spoolRoot, session, { includeReasoning: true });
      const entry = {
        sessionId: session.sessionId,
        shortId: session.shortId,
        tool: session.tool,
        project: session.project,
        projectRaw: session.projectRaw,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        nameSlug: session.nameSlug,
        displayName: session.displayName,
        relativePath: written.md,
        sourcePath: session.sourcePath,
        sourceMtimeMs: discovered.sourceMtimeMs,
        sourceSha256: discovered.sourceSha256
      };
      upsertEntry(idx, entry);
      result.imported++;
    }
  }
  saveIndex(spoolRoot, idx);
  return result;
}
var init_scan_and_import = __esm({
  "src/spool/scan-and-import.ts"() {
    "use strict";
    init_claude_code();
    init_vscode_copilot();
    init_project_filter();
    init_index_store();
    init_ensure_dir();
    init_writer();
  }
});

// src/digest/orchestrator.ts
var orchestrator_exports = {};
__export(orchestrator_exports, {
  orchestrateCmd: () => orchestrateCmd
});
import { execFileSync as execFileSync2 } from "node:child_process";
function isMemexOnPath() {
  try {
    execFileSync2("/bin/sh", ["-c", "command -v memex >/dev/null 2>&1"], {
      stdio: "ignore"
    });
    return true;
  } catch {
    return false;
  }
}
async function orchestrateCmd(opts) {
  if (opts.mode !== "project" && opts.mode !== "global") {
    throw new Error(`Invalid mode '${opts.mode}'. Expected 'project' or 'global'.`);
  }
  ensureSpoolDir();
  const memexInstalled = isMemexOnPath();
  let result;
  if (opts.mode === "project") {
    const cwd = opts.cwd ?? process.cwd();
    const project = projectSlugFromPath(cwd);
    const scan = await scanAndImport({ projectFilter: project });
    result = {
      mode: "project",
      project,
      cwd,
      scan,
      nextStep: "run-prepare-then-digest",
      memexInstalled
    };
  } else {
    const scan = await scanAndImport({ projectFilter: null });
    result = {
      mode: "global",
      project: null,
      cwd: null,
      scan,
      nextStep: "run-fanout-then-catalog",
      memexInstalled
    };
  }
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}
var init_orchestrator = __esm({
  "src/digest/orchestrator.ts"() {
    "use strict";
    init_ensure_dir();
    init_scan_and_import();
    init_slug();
  }
});

// node_modules/commander/esm.mjs
var import_index = __toESM(require_commander(), 1);
var {
  program,
  createCommand,
  createArgument,
  createOption,
  CommanderError,
  InvalidArgumentError,
  InvalidOptionArgumentError,
  // deprecated old name
  Command,
  Argument,
  Option,
  Help
} = import_index.default;

// src/plugin-cli.ts
import { readFileSync as readFileSync26 } from "node:fs";
import { fileURLToPath as fileURLToPath2 } from "node:url";
import { dirname as dirname12, resolve as resolve8 } from "node:path";
function readPackageVersion() {
  const here = dirname12(fileURLToPath2(import.meta.url));
  for (const rel of ["../package.json", "../../package.json", "../../../package.json"]) {
    try {
      return JSON.parse(readFileSync26(resolve8(here, rel), "utf8")).version;
    } catch {
    }
  }
  return "0.0.0-unknown";
}
async function run(argv) {
  const program2 = new Command();
  program2.name("vibebook-plugin").description("Vibebook Claude Code plugin internal CLI (invoked by skills, not by users)").version(readPackageVersion(), "-v, --version", "print the installed plugin version");
  program2.command("list-projects").description("List projects with pending sessions in the spool. Used by /vibebook to detect mode.").action(async () => {
    const { listProjectsCmd: listProjectsCmd2 } = await Promise.resolve().then(() => (init_list_projects(), list_projects_exports));
    await listProjectsCmd2();
  });
  program2.command("prepare").description("Emit the JSON payload of new sessions for the /vibebook skill to digest.").option("--cwd <path>", "treat this dir as the user's cwd (default: process.cwd())").option("--project <slug>", "force a specific project slug").action(async (opts) => {
    const { prepareCmd: prepareCmd2 } = await Promise.resolve().then(() => (init_prepare(), prepare_exports));
    await prepareCmd2({ cwd: opts.cwd, project: opts.project });
  });
  program2.command("publish").description("Write chronicle/topic md files emitted by the /vibebook skill into the book.").option("--chronicles <path>", "path to chronicles JSON").option("--topics <path>", "path to topics JSON").option("--no-catalog", "skip book/index.md regen (caller will batch)").action(async (opts) => {
    const { publishCmd: publishCmd2 } = await Promise.resolve().then(() => (init_publish(), publish_exports));
    const report = await publishCmd2({
      chroniclesPath: opts.chronicles,
      topicsPath: opts.topics,
      noCatalog: opts.catalog === false
    });
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  });
  program2.command("finalize").description("Ensure the session-repo is a git repo, commit all plugin-written paths (raw_sessions/book/memory/index), and push if a remote is configured. Never stages foreign files.").option("--no-push", "commit locally only; never push even if a remote is configured").action(async (o2) => {
    const { finalizeCmd: finalizeCmd2 } = await Promise.resolve().then(() => (init_finalize(), finalize_exports));
    const r2 = await finalizeCmd2({ noPush: o2.push === false });
    console.log(JSON.stringify(r2));
  });
  program2.command("memory-write").description("Write typed-memory .md files + update the memory index from an agent JSON payload.").option("--input <path>", "path to memory entries JSON").action(async (opts) => {
    const { memoryWriteCmd: memoryWriteCmd2 } = await Promise.resolve().then(() => (init_memory_write(), memory_write_exports));
    const report = await memoryWriteCmd2({ inputPath: opts.input });
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  });
  program2.command("memory-index").description("Rebuild .vibebook/index.memory.json from the memory/ markdown files.").action(async () => {
    const { memoryIndexCmd: memoryIndexCmd2 } = await Promise.resolve().then(() => (init_memory_index(), memory_index_exports));
    const report = await memoryIndexCmd2();
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  });
  program2.command("memory-query").description("Load typed memory for the cwd's project and emit layered context (Core/Procedures/Semantic/Episodes/Conflicts) + primer.").option("--cwd <path>", "treat this dir as the user's cwd (default: process.cwd())").option("--type <type>", "filter by memory type").option("--q <text>", "free-text query").action(async (opts) => {
    const { memoryQueryCmd: memoryQueryCmd2 } = await Promise.resolve().then(() => (init_memory_query(), memory_query_exports));
    await memoryQueryCmd2({ cwd: opts.cwd, type: opts.type, q: opts.q });
  });
  program2.command("memory-primer").description("Read-only: print the cwd project's primer markdown (used by the SessionStart hook). Never writes, always exits 0.").option("--cwd <path>", "treat this dir as the user's cwd (default: process.cwd())").action(async (opts) => {
    const { memoryPrimerCmd: memoryPrimerCmd2 } = await Promise.resolve().then(() => (init_memory_primer(), memory_primer_exports));
    await memoryPrimerCmd2({ cwd: opts.cwd });
  });
  program2.command("entity-write").description("Write entity-wiki .md pages + update .vibebook/index.entity.json from an agent JSON payload.").option("--input <path>", "path to entity pages JSON").action(async (o2) => {
    const { entityWriteCmd: entityWriteCmd2 } = await Promise.resolve().then(() => (init_entity_write(), entity_write_exports));
    const r2 = await entityWriteCmd2({ inputPath: o2.input });
    process.stdout.write(JSON.stringify(r2, null, 2) + "\n");
  });
  program2.command("entity-index").description("Rebuild .vibebook/index.entity.json from memory/entities/ markdown.").action(async () => {
    const { entityIndexCmd: entityIndexCmd2 } = await Promise.resolve().then(() => (init_entity_index(), entity_index_exports));
    const r2 = await entityIndexCmd2();
    process.stdout.write(JSON.stringify(r2, null, 2) + "\n");
  });
  program2.command("entity-query").description("Load entity wiki for the cwd's project, score, and emit ranked entities. --entity <name> adds a reverse lookup of memories referencing it (for digest authoring).").option("--cwd <path>", "treat this dir as cwd (default process.cwd())").option("--q <text>", "free-text query").option("--kind <kind>", "filter by entity kind (file|symbol|api|concept|person)").option("--entity <name>", "reverse-lookup: entities + memories referencing this name").action(async (o2) => {
    const { entityQueryCmd: entityQueryCmd2 } = await Promise.resolve().then(() => (init_entity_query(), entity_query_exports));
    await entityQueryCmd2(o2);
  });
  program2.command("qa-write").description("Write distilled Q&A .md pages + update .vibebook/index.qa.json from an agent JSON payload.").option("--input <path>", "path to qa pages JSON").action(async (o2) => {
    const { qaWriteCmd: qaWriteCmd2 } = await Promise.resolve().then(() => (init_qa_write(), qa_write_exports));
    const r2 = await qaWriteCmd2({ inputPath: o2.input });
    process.stdout.write(JSON.stringify(r2, null, 2) + "\n");
  });
  program2.command("qa-index").description("Rebuild .vibebook/index.qa.json from memory/qa/ markdown.").action(async () => {
    const { qaIndexCmd: qaIndexCmd2 } = await Promise.resolve().then(() => (init_qa_index(), qa_index_exports));
    const r2 = await qaIndexCmd2();
    process.stdout.write(JSON.stringify(r2, null, 2) + "\n");
  });
  program2.command("qa-query").description("Load distilled Q&A for the cwd's project, score, and emit ranked Q&A (index-only, read-only).").option("--cwd <path>", "working directory to resolve the project from").option("--q <text>", "free-text query").option("--kind <kind>", "filter by qa kind (compound|troubleshooting|decision|operational)").action(async (o2) => {
    const { qaQueryCmd: qaQueryCmd2 } = await Promise.resolve().then(() => (init_qa_query(), qa_query_exports));
    await qaQueryCmd2(o2);
  });
  program2.command("memory-lint").description("Read-only integrity diagnostic across memory/entity/qa indexes (never writes). --json for structured output.").option("--cwd <path>", "scope findings to the project at this path (+ global/user); default: lint the whole store").option("--json", "emit the structured LintReport JSON instead of a human report").option("--stale-days <n>", "age threshold for stale episodic/working (default 90)", (v) => parseInt(v, 10)).action(async (o2) => {
    const { memoryLintCmd: memoryLintCmd2 } = await Promise.resolve().then(() => (init_memory_lint(), memory_lint_exports));
    await memoryLintCmd2({ cwd: o2.cwd, json: o2.json, staleDays: o2.staleDays });
  });
  program2.command("memory-propose").description("Queue a gated (core/procedural/pinned) memory change as a local proposal instead of writing it. Reads an --input JSON array of {entry, body, rationale?, sourceSession?}.").requiredOption("--input <path>", "JSON file: array of { entry, body, rationale?, sourceSession? }").action(async (o2) => {
    const { memoryProposeCmd: memoryProposeCmd2 } = await Promise.resolve().then(() => (init_memory_propose(), memory_propose_exports));
    const r2 = await memoryProposeCmd2({ inputPath: o2.input });
    console.log(JSON.stringify(r2));
  });
  program2.command("memory-diff").description("Read-only: show pending local memory proposals as a diff vs current live memory. Never writes.").option("--id <targetKey>", "show only the proposal for this target (e.g. core/yue-workflow)").option("--json", "emit a structured JSON array instead of a human report").action(async (o2) => {
    const { memoryDiffCmd: memoryDiffCmd2 } = await Promise.resolve().then(() => (init_memory_diff(), memory_diff_exports));
    await memoryDiffCmd2({ id: o2.id, json: o2.json });
  });
  program2.command("memory-approve").description("Apply a pending local memory proposal to live memory, delete the proposal, and refresh affected primers.").requiredOption("--id <targetKey>", "the proposal's target key (e.g. core/yue-workflow)").action(async (o2) => {
    const { memoryApproveCmd: memoryApproveCmd2 } = await Promise.resolve().then(() => (init_memory_approve(), memory_approve_exports));
    const r2 = await memoryApproveCmd2({ id: o2.id });
    console.log(JSON.stringify(r2));
  });
  program2.command("memory-reject").description("Discard a pending local memory proposal without applying it.").requiredOption("--id <targetKey>", "the proposal's target key (e.g. core/yue-workflow)").action(async (o2) => {
    const { memoryRejectCmd: memoryRejectCmd2 } = await Promise.resolve().then(() => (init_memory_reject(), memory_reject_exports));
    const r2 = await memoryRejectCmd2({ id: o2.id });
    console.log(JSON.stringify(r2));
  });
  program2.command("recall").description("Three-stage progressive recall. Stage 1 = topics; --topic = stage 2; Read tool = stage 3.").option("--cwd <path>", "infer project from this cwd").option("--project <slug>", "force a specific project slug").option("--topic <slug>", "stage 2: list chronicles in this topic").action(async (opts) => {
    const { recallCmd: recallCmd2 } = await Promise.resolve().then(() => (init_recall(), recall_exports));
    await recallCmd2({ cwd: opts.cwd, project: opts.project, topic: opts.topic });
  });
  program2.command("catalog-regen").description("Rebuild book/index.md after a global sweep.").option("--no-commit", "skip git commit + push of the regenerated catalog").action(async (opts) => {
    const { catalogRegenCmd: catalogRegenCmd2 } = await Promise.resolve().then(() => (init_catalog_regen(), catalog_regen_exports));
    const report = await catalogRegenCmd2({ noCommit: opts.commit === false });
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  });
  program2.command("site <action>").description("Render the book as a static site. Actions: serve | build").action(async (action) => {
    if (action === "serve") {
      const { serveSiteCmd: serveSiteCmd2 } = await Promise.resolve().then(() => (init_site(), site_exports));
      await serveSiteCmd2();
    } else if (action === "build") {
      const { buildSiteCmd: buildSiteCmd2 } = await Promise.resolve().then(() => (init_site(), site_exports));
      await buildSiteCmd2();
    } else {
      throw new Error(`Unknown site action "${action}". Expected "serve" or "build".`);
    }
  });
  program2.command("first-run").description("Show one-time onboarding tip if not shown before. Used by skill at start.").action(async () => {
    const { firstRunCmd: firstRunCmd2 } = await Promise.resolve().then(() => (init_first_run(), first_run_exports));
    await firstRunCmd2();
  });
  program2.command("orchestrate <mode>").description("Plugin's autonomy entry: scan local jsonl into spool, then yield to caller. Modes: project | global").option("--cwd <path>", "user cwd (project mode)").action(async (mode, opts) => {
    const { orchestrateCmd: orchestrateCmd2 } = await Promise.resolve().then(() => (init_orchestrator(), orchestrator_exports));
    await orchestrateCmd2({ mode, cwd: opts.cwd });
  });
  await program2.parseAsync(argv);
}
var _thisFile = fileURLToPath2(import.meta.url);
var _mainFile = process.argv[1] ? resolve8(process.argv[1]) : "";
if (_thisFile === _mainFile || _mainFile.endsWith("vibebook-plugin.js")) {
  run(process.argv).catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
export {
  run
};
