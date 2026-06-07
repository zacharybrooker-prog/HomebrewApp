#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::sync::{Arc, Mutex, OnceLock};
use tokio::sync::RwLock;
use warp::Filter;
use yrs::Doc;
use y_sync::awareness::Awareness;
use y_sync::net::{BroadcastGroup, Connection};
use mdns_sd::{ServiceDaemon, ServiceInfo};
use tauri::command;
use futures_util::{StreamExt, SinkExt};
use warp::reply::Reply;

type BcastMap = Mutex<HashMap<String, Arc<RwLock<BroadcastGroup>>>>;

static BCAST: OnceLock<BcastMap> = OnceLock::new();

fn get_bcast_group(campaign_id: &str, subdoc: &str) -> Arc<RwLock<BroadcastGroup>> {
    let bcasts = BCAST.get_or_init(|| Mutex::new(HashMap::new()));
    let mut map = bcasts.lock().unwrap();
    let key = format!("{}/{}", campaign_id, subdoc);
    if let Some(bcast) = map.get(&key) {
        return bcast.clone();
    }
    
    let doc = Doc::new();
    let awareness = Arc::new(RwLock::new(Awareness::new(doc)));
    let bcast = Arc::new(RwLock::new(BroadcastGroup::new(awareness, 10)));
    map.insert(key.clone(), bcast.clone());
    bcast
}

#[command]
async fn start_lan_server(campaign_id: String, dm_name: String) -> Result<u16, String> {
    let campaign_id_filter = warp::path("campaign")
        .and(warp::path::param::<String>())
        .and(warp::path::param::<String>())
        .and(warp::path::end());
        
    let ws_route = campaign_id_filter
        .and(warp::query::<HashMap<String, String>>())
        .and(warp::ws())
        .map(move |c_id: String, subdoc: String, query: HashMap<String, String>, ws: warp::ws::Ws| {
            let role = query.get("role").map(|s| s.as_str()).unwrap_or("");
            
            if role == "player" && (subdoc == "shared" || subdoc == "dm") {
                return warp::reply::with_status("Unauthorized", warp::http::StatusCode::UNAUTHORIZED).into_response();
            }
            
            let bcast = get_bcast_group(&c_id, &subdoc);
            
            ws.on_upgrade(move |websocket| {
                async move {
                    let (tx, rx) = websocket.split();
                    
                    let sink = tx.with(|msg: Vec<u8>| async move {
                        Ok::<_, warp::Error>(warp::ws::Message::binary(msg))
                    });
                    
                    let stream = rx.filter_map(|msg| async move {
                        match msg {
                            Ok(msg) if msg.is_binary() => Some(Ok::<_, warp::Error>(msg.into_bytes())),
                            Ok(_) => None,
                            Err(e) => Some(Err(e)),
                        }
                    });
                    
                    let conn = Connection::new(stream, sink);
                    bcast.write().await.add_connection(conn);
                }
            }).into_response()
        });
        
    let (addr, server) = warp::serve(ws_route).bind_ephemeral(([0, 0, 0, 0], 0));
    
    tokio::spawn(server);
    
    let mdns = ServiceDaemon::new().map_err(|e| e.to_string())?;
    let service_type = "_frogsworld._tcp.local.";
    let host_name = format!("{}.local.", dm_name.replace(" ", ""));
    let properties = vec![
        ("campaignId", campaign_id.as_str()),
        ("host", dm_name.as_str()),
    ];
    let my_service = ServiceInfo::new(
        service_type,
        &dm_name,
        host_name.as_str(),
        addr.ip().to_string(),
        addr.port(),
        &properties[..],
    ).map_err(|e| e.to_string())?;
    
    mdns.register(my_service).map_err(|e| e.to_string())?;
    
    Ok(addr.port())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![start_lan_server])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                ).unwrap();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
