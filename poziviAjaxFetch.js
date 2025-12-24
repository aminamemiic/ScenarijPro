const PoziviAjax = (function() {
    return {
        postScenario: function(title, callback) {
            fetch("/api/scenarios", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ title: title })
            })
            .then(res =>
                res.json().then(data => callback(res.status, data))
            )
            .catch(err =>
                callback(0, { error: err.message })
            );
        },
        lockLine: function(scenarioId, lineId, userId, callback) { 
            fetch(`/    api/scenarios/${scenarioId}/lines/${lineId}/lock`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ userId: userId })
            })
            .then(res =>
                res.json().then(data => callback(res.status, data))
            )
            .catch(err =>
                callback(0, { error: err.message })
            );
        },
        updateLine: function(scenarioId, lineId, userId, newText, callback) {
            fetch(`/api/scenarios/${scenarioId}/lines/${lineId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ userId: userId, newText: newText })
            })
            .then(res =>
                res.json().then(data => callback(res.status, data))
            )
            .catch(err =>
                callback(0, { error: err.message })
            );
        },
        lockCharacter: function(scenarioId, characterName, userId, callback) {
            fetch(`/api/scenarios/${scenarioId}/characters/lock`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ userId: userId, characterName: characterName })
            })
            .then(res =>
                res.json().then(data => callback(res.status, data))
            )
            .catch(err =>
                callback(0, { error: err.message })
            );
        },
        updateCharacter: function(scenarioId, userId, oldName, newName, callback) {
            fetch(`/api/scenarios/${scenarioId}/characters/update`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ userId: userId, oldName: oldName, newName: newName })
            })
            .then(res =>
                res.json().then(data => callback(res.status, data))
            )
            .catch(err =>
                callback(0, { error: err.message })
            );
        },
        getDeltas: function(scenarioId, since, callback) {
            fetch(`/api/scenarios/${scenarioId}/deltas?since=${since}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json"
                }
            })
            .then(res =>
                res.json().then(data => callback(res.status, data))
            )
            .catch(err =>
                callback(0, { error: err.message })
            );
        },
        getScenario: function(scenarioId, callback) {
            fetch(`/api/scenarios/${scenarioId}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json"
                }
            })
            .then(res =>
                res.json().then(data => callback(res.status, data))
            )
            .catch(err =>
                callback(0, { error: err.message })
            );
        }
    };
})();